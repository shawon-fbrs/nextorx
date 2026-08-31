'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedPairRef = useRef<string | null>(null);
  const onTickRef = useRef(onTick);
  const onCandleCloseRef = useRef(onCandleClose);
  const onSnapshotRef = useRef(onSnapshot);
  onTickRef.current = onTick;
  onCandleCloseRef.current = onCandleClose;
  onSnapshotRef.current = onSnapshot;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (pairId) {
        ws.send(JSON.stringify({ type: 'subscribe', pairId }));
        subscribedPairRef.current = pairId;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'tick') {
          setCurrentPrice(msg.price);
          setCandle(msg.candle);
          onTickRef.current?.(msg);
        }

        if (msg.type === 'snapshot') {
          setCurrentPrice(msg.price);
          setCandle(msg.candle);
          onSnapshotRef.current?.(msg);
        }

        if (msg.type === 'candle:close') {
          onCandleCloseRef.current?.(msg);
        }
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [pairId]);

  useEffect(() => {
    connect();

    return () => {
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

  return { isConnected, currentPrice, candle, sendMessage };
}

type UsePairWSReturn = ReturnType<typeof usePairWS>;
