import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { getOTCEngine, type TickMessage, type CandleCloseMessage } from './lib/otc-engine';
import { reconcileExpiredTrades } from './lib/trade-reconciliation';
import { startSettlementWorker, stopSettlementWorker } from './lib/settlement-worker';
import { prisma } from './lib/db';
import { setBroadcastFn } from './lib/ws-broadcast';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '/', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

const SESSION_COOKIE_NAMES = [
  '__Secure-better-auth.session_token',
  'better-auth.session_token',
];

function getSessionTokenCandidates(req: IncomingMessage): string[] {
  const header = req.headers.cookie;
  if (!header) return [];
  const cookies = header.split(';').map((s) => s.trim());
  for (const name of SESSION_COOKIE_NAMES) {
    const found = cookies.find((c) => c.startsWith(name + '='));
    if (found) {
      const value = decodeURIComponent(found.slice(name.length + 1));
      const candidates = [value];
      const unsigned = value.split('.')[0];
      if (unsigned && unsigned !== value) candidates.push(unsigned);
      return candidates;
    }
  }
  return [];
}

async function authorizeWs(req: IncomingMessage): Promise<{ userId: string; role: string } | null> {
  try {
    const candidates = getSessionTokenCandidates(req);
    if (candidates.length === 0) {
      console.log("[WS] reject: no session cookie");
      return null;
    }
    const session = await prisma.session.findFirst({
      where: { token: { in: candidates }, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, role: true, banned: true, banExpires: true } } },
    });
    if (!session) {
      console.log(`[WS] reject: session not found (candidates=${candidates.length}, lens=${candidates.map((c) => c.length).join(",")})`);
      return null;
    }
    if (session.user.banned && (!session.user.banExpires || session.user.banExpires.getTime() > Date.now())) {
      console.log(`[WS] reject: banned user ${session.user.id}`);
      return null;
    }
    const ban = await prisma.bannedUser.findUnique({ where: { userId: session.user.id } });
    if (ban) {
      console.log(`[WS] reject: ban table user ${session.user.id}`);
      return null;
    }
    return { userId: session.user.id, role: session.user.role };
  } catch (e) {
    console.log("[WS] reject: authorize error", e instanceof Error ? e.message : e);
    return null;
  }
}

  const wss = new WebSocketServer({ server, path: '/ws' });

  const engine = await getOTCEngine();
  const loadingPairs = new Set<string>();

  // User connection tracking: userId → Set<WebSocket>
  const userConnections = new Map<string, Set<WebSocket>>();

  function trackUserConnection(userId: string, ws: WebSocket) {
    let set = userConnections.get(userId);
    if (!set) {
      set = new Set();
      userConnections.set(userId, set);
    }
    set.add(ws);
  }

  function untrackUserConnection(userId: string, ws: WebSocket) {
    const set = userConnections.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) userConnections.delete(userId);
    }
  }

  function broadcastToUser(userId: string, message: Record<string, unknown>) {
    const set = userConnections.get(userId);
    if (!set) return;
    const data = JSON.stringify(message);
    for (const ws of Array.from(set)) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      } catch {}
    }
  }

  // Expose broadcastToUser for settlement worker and other modules
  setBroadcastFn(broadcastToUser);

  // Sentiment broadcast: compute up/down percentages for subscribed pairs
  function broadcastSentiment() {
    const pairIds = new Set<string>();
    for (const ws of wss.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      for (const [userId, set] of userConnections) {
        if (set.has(ws)) {
          // We track subscribed pairs per-connection via the message handler
        }
      }
    }
    // Broadcast sentiment for all pairs with subscribers
    for (const state of engine.getPairs()) {
      const subs = engine.getSubscribers(state.pairId);
      if (!subs || subs.size === 0) continue;
      // Simple sentiment: use a deterministic hash-based approach per pair
      const seed = Date.now() + state.pairId.length;
      const upPct = 30 + ((seed % 41)); // 30-70% range
      const data = JSON.stringify({ type: 'sentiment:updated', pairId: state.pairId, upPct, downPct: 100 - upPct });
      for (const ws of Array.from(subs)) {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        } catch {}
      }
    }
  }

  // Broadcast sentiment every 5 seconds
  const sentimentTimer = setInterval(broadcastSentiment, 5000);

  // Reconcile any expired trades from previous session
  await reconcileExpiredTrades();

  engine.setBroadcast((msg: TickMessage | CandleCloseMessage) => {
    const pairSubs = engine.getSubscribers(msg.pairId);
    if (!pairSubs || pairSubs.size === 0) return;

    const data = JSON.stringify(msg);
    for (const ws of Array.from(pairSubs)) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        } else {
          engine.unsubscribeAll(ws);
          try {
            ws.terminate();
          } catch {}
        }
      } catch {
        try {
          engine.unsubscribeAll(ws);
        } catch {}
        try {
          ws.terminate();
        } catch {}
      }
    }
  });

  engine.setSeedRevealedListener((day: string, pairId: string, seed: string) => {
    const data = JSON.stringify({ type: "seed-revealed", day, pairId, seed });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  engine.start();

  // Durable polling settlement (survives restarts via startup reconciliation above).
  // TRACK-B B2: replace with BullMQ persistent queue + dead-letter queue.
  startSettlementWorker();

  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received, stopping engines...`);
    clearInterval(sentimentTimer);
    try {
      engine.stop();
    } catch {}
    try {
      stopSettlementWorker();
    } catch {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const authed = await authorizeWs(req);
    if (!authed) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    const { userId } = authed;
    trackUserConnection(userId, ws);

    const subscribedPairs = new Set<string>();

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && msg.pairId) {
          engine.subscribe(msg.pairId, ws);
          subscribedPairs.add(msg.pairId);

          const sendSnapshot = () => {
            try {
              const candle = engine.getCandle(msg.pairId);
              const price = engine.getCurrentPrice(msg.pairId);
              if (candle && price !== null) {
                ws.send(JSON.stringify({
                  type: 'snapshot',
                  pairId: msg.pairId,
                  price,
                  candle,
                  timestamp: Date.now(),
                }));
                return true;
              }
            } catch {}
            return false;
          };

          if (!sendSnapshot() && !engine.hasPair(msg.pairId) && !loadingPairs.has(msg.pairId)) {
            loadingPairs.add(msg.pairId);
            console.log(`[WS] on-demand load for unknown pair ${msg.pairId}`);
            void engine.addPair(msg.pairId)
              .catch((e) => console.error(`[WS] on-demand load failed for ${msg.pairId}:`, e instanceof Error ? e.message : e))
              .finally(() => {
                loadingPairs.delete(msg.pairId);
                sendSnapshot();
              });
          }
        }

        if (msg.type === 'unsubscribe' && msg.pairId) {
          engine.unsubscribe(msg.pairId, ws);
          subscribedPairs.delete(msg.pairId);
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {}
    });

    ws.on('close', () => {
      for (const pairId of Array.from(subscribedPairs)) {
        engine.unsubscribe(pairId, ws);
      }
      untrackUserConnection(userId, ws);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket on ws://${hostname}:${port}/ws`);
  });
});
