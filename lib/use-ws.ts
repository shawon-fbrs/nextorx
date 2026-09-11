'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { setServerOffset } from '@/lib/server-time';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickMessage {
  type: 'tick';
  pairId: string;
  price: number;
  timestamp: number;
  candle: CandleData;
}

export interface SnapshotMessage {
  type: 'snapshot';
  pairId: string;
  price: number;
  candle: CandleData;
  timestamp?: number;
}

export interface CandleCloseMessage {
  type: 'candle:close';
  pairId: string;
  candle: CandleData;
}

type WSMessage = TickMessage | SnapshotMessage | CandleCloseMessage;

interface UsePairWSOptions {
  pairId: string | null;
  onTick?: (msg: TickMessage) => void;
  onCandleClose?: (msg: CandleCloseMessage) => void;
  onSnapshot?: (msg: SnapshotMessage) => void;
}

export function usePairWS({ pairId, onTick, onCandleClose, onSnapshot }: UsePairWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [candle, setCandle] = useState<CandleData | null>(null);
  const [serverTime, setServerTime] = useState<number | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgRef = useRef<number>(Date.now());
  const subscribedPairRef = useRef<string | null>(null);
  const pairIdRef = useRef(pairId);
  pairIdRef.current = pairId;
  const onTickRef = useRef(onTick);
  const onCandleCloseRef = useRef(onCandleClose);
  const onSnapshotRef = useRef(onSnapshot);
  onTickRef.current = onTick;
  onCandleCloseRef.current = onCandleClose;
  onSnapshotRef.current = onSnapshot;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const getWsUrl = () => {
      const host = window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${host}/ws`;
    };
    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      lastMsgRef.current = Date.now();
      const cur = pairIdRef.current;
      if (cur) {
        ws.send(JSON.stringify({ type: 'subscribe', pairId: cur }));
        subscribedPairRef.current = cur;
      }
    };

    const lastTickRef = { current: 0 } as { current: number };
    ws.onmessage = (event) => {
      try {
        lastMsgRef.current = Date.now();
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'tick') {
          setServerOffset(msg.timestamp, Date.now());
          setServerTime(msg.timestamp);
          const now = Date.now();
          if (now - lastTickRef.current >= 150) {
            lastTickRef.current = now;
            setCurrentPrice(msg.price);
            setCandle(msg.candle);
          }
          onTickRef.current?.(msg);
        }

        if (msg.type === 'snapshot') {
          const ts = (msg as SnapshotMessage).timestamp ?? Date.now();
          setServerOffset(ts, Date.now());
          setServerTime(ts);
          setCurrentPrice(msg.price);
          setCandle(msg.candle);
          onSnapshotRef.current?.(msg);
        }

        if (msg.type === 'candle:close') {
          onCandleCloseRef.current?.(msg);
        }
      } catch {}
    };

    ws.onclose = (ev) => {
      setIsConnected(false);
      wsRef.current = null;
      if (ev.code !== 1000 && ev.code !== 4401) {
        console.warn(`[WS] closed unexpectedly (code=${ev.code}), reconnecting…`);
      }
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();

    const heartbeat = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsgRef.current > 10_000) {
        try {
          ws.close();
        } catch {}
      }
    }, 5000);

    return () => {
      clearInterval(heartbeat);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (subscribedPairRef.current) {
      ws.send(JSON.stringify({ type: 'unsubscribe', pairId: subscribedPairRef.current }));
    }

    if (pairId) {
      ws.send(JSON.stringify({ type: 'subscribe', pairId }));
      subscribedPairRef.current = pairId;
    }
  }, [pairId]);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, currentPrice, candle, serverTime, sendMessage };
}

type UsePairWSReturn = ReturnType<typeof usePairWS>;
