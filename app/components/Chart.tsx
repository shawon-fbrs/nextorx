'use client';

import { useRef, useEffect } from 'react';
import { init, dispose } from 'klinecharts';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartProps {
  candles: Candle[];
  currentPrice: number;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateBackwardCandles(fromTimestamp: number, count: number, basePrice: number): Candle[] {
  const rand = seededRand(fromTimestamp);
  const candles: Candle[] = [];
  let price = basePrice + (rand() - 0.5) * 0.02;
  const interval = 60;
  let trend = 0;
  for (let i = 0; i < count; i++) {
    trend += (rand() - 0.5) * 0.008;
    trend = Math.max(-0.01, Math.min(0.01, trend));
    const volatility = (rand() * 0.008 + 0.003) * basePrice;
    const open = price;
    const drift = trend + (rand() - 0.5) * volatility;
    const close = open + drift;
    const wickUp = rand() * volatility * 0.8;
    const wickDown = rand() * volatility * 0.8;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    candles.unshift({
      time: fromTimestamp - (count - i) * interval,
      open,
      high,
      low,
      close,
    });
    price = open;
  }
  return candles;
}

export function Chart({ candles, currentPrice }: ChartProps) {
  const chartIdRef = useRef(`kline-${Math.random().toString(36).slice(2)}`);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof init> | null>(null);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = init(chartIdRef.current, { styles: 'dark' });
    chartRef.current = chart;

    if (chart) {
      chart.setSymbol({ name: 'EUR/USD' });
      chart.setPeriod({ span: 1, type: 'minute' });
      chart.createIndicator('MA', false);
      chart.createIndicator('VOL', false);

      chart.setDataLoader({
        getBars: ({ type, timestamp, callback }) => {
          if (type === 'init') {
            const data = candlesRef.current.map(c => ({
              timestamp: c.time * 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: Math.floor(Math.random() * 10000),
            }));
            callback(data, false);
          } else if (type === 'backward' && timestamp) {
            const basePrice = candlesRef.current.length > 0
              ? candlesRef.current[0].open
              : 1.0;
            const older = generateBackwardCandles(Math.floor(timestamp / 1000), 50, basePrice);
            const data = older.map(c => ({
              timestamp: c.time * 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: Math.floor(Math.random() * 10000),
            }));
            callback(data, true);
          }
        },
      });

      chart.resetData();
      chart.setBarSpace(8);
      chart.scrollToRealTime(0);
    }

    const ro = new ResizeObserver(() => { chart?.resize(); });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      dispose(chartIdRef.current);
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#161a22] overflow-hidden">
      <div ref={chartContainerRef} id={chartIdRef.current} className="absolute inset-0" />
    </div>
  );
}
