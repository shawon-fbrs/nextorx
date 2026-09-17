// Shared WS broadcast function, set by server.ts at startup
// Other modules (settle-trade, ledger, etc.) import this to send messages to users

type BroadcastFn = (userId: string, message: Record<string, unknown>) => void;

let broadcastFn: BroadcastFn | null = null;

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastFn = fn;
}

export function broadcastToUser(userId: string, message: Record<string, unknown>) {
  if (broadcastFn) broadcastFn(userId, message);
}
