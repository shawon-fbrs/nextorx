import { WebSocket } from "ws";

export interface PairState {
  pairId: string;
  name: string;
  category: string;
  basePrice: number;
  volatility: number;
  payoutPercent: number;
  spread: number;
  currentPrice: number;
  candle: CandleData;
  subscribers: Set<WebSocket>;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickMessage {
  type: "tick";
  pairId: string;
  price: number;
  timestamp: number;
  candle: CandleData;
}

export interface CandleCloseMessage {
  type: "candle:close";
  pairId: string;
  candle: CandleData;
}
