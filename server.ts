import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { getOTCEngine, type TickMessage, type CandleCloseMessage } from './lib/otc-engine';

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

  const wss = new WebSocketServer({ server, path: '/ws' });

  const engine = await getOTCEngine();

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

  wss.on('connection', (ws: WebSocket) => {
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
