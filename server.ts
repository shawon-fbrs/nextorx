import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { getOTCEngine, type TickMessage, type CandleCloseMessage } from './lib/otc-engine';
import { reconcileExpiredTrades } from './lib/trade-reconciliation';
import { startSettlementWorker } from './lib/settlement-worker';
import { prisma } from './lib/db';

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
    if (candidates.length === 0) return null;
    const session = await prisma.session.findFirst({
      where: { token: { in: candidates }, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, role: true, banned: true, banExpires: true } } },
    });
    if (!session) return null;
    if (session.user.banned && (!session.user.banExpires || session.user.banExpires.getTime() > Date.now())) return null;
    const ban = await prisma.bannedUser.findUnique({ where: { userId: session.user.id } });
    if (ban) return null;
    return { userId: session.user.id, role: session.user.role };
  } catch {
    return null;
  }
}

  const wss = new WebSocketServer({ server, path: '/ws' });

  const engine = await getOTCEngine();

  // Reconcile any expired trades from previous session
  await reconcileExpiredTrades();

  engine.setBroadcast((msg: TickMessage | CandleCloseMessage) => {
    const pairSubs = engine.getSubscribers(msg.pairId);
    if (!pairSubs || pairSubs.size === 0) return;

    const data = JSON.stringify(msg);
    for (const ws of Array.from(pairSubs)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  });

  engine.start();

  // Durable polling settlement (survives restarts via startup reconciliation above).
  // TRACK-B B2: replace with BullMQ persistent queue + dead-letter queue.
  startSettlementWorker();

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const authed = await authorizeWs(req);
    if (!authed) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    const subscribedPairs = new Set<string>();

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && msg.pairId) {
          engine.subscribe(msg.pairId, ws);
          subscribedPairs.add(msg.pairId);

          const candle = engine.getCandle(msg.pairId);
          const price = engine.getCurrentPrice(msg.pairId);
          if (candle && price !== null) {
            ws.send(JSON.stringify({
              type: 'snapshot',
              pairId: msg.pairId,
              price,
              candle,
            }));
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
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket on ws://${hostname}:${port}/ws`);
  });
});
