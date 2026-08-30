'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { init, dispose, registerOverlay, Chart as KLineChart } from 'klinecharts';

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
  onOverlaySelected?: (overlay: { id: string; name: string } | null) => void;
}

export interface ChartHandle {
  createOverlay: (name: string, onSelected?: (id: string) => void, onDeselected?: () => void) => void;
  removeOverlay: (id?: string) => void;
  removeAllOverlays: () => void;
  overrideOverlay: (id: string, overlay: Record<string, unknown>) => void;
  copyOverlay: (id: string) => void;
  getOverlays: () => Array<{ id: string; name: string }>;
  getChart: () => KLineChart | null;
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

const CUSTOM_OVERLAYS: Array<{
  name: string;
  totalStep: number;
  needDefaultPointFigure: boolean;
  needDefaultXAxisFigure: boolean;
  needDefaultYAxisFigure: boolean;
  createPointFigures: (params: { coordinates: Array<{ x: number; y: number }>; overlay: { points?: Array<{ value?: number; timestamp?: number; dataIndex?: number }> } }) => Array<{ key: string; type: string; attrs: Record<string, unknown>; styles?: Record<string, unknown> }>;
}> = [
  {
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates }: { coordinates: Array<{ x: number; y: number }> }) => {
      if (coordinates.length < 2) return [];
      const p1 = coordinates[0];
      const p2 = coordinates[1];
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      return [
        { type: 'rect', key: 'rect', attrs: { x, y, width: w, height: h }, styles: { style: 'stroke_fill', color: 'rgba(0,122,255,0.1)', borderColor: '#007aff', borderSize: 1, borderRadius: 0 } },
      ];
    },
  },
  {
    name: 'arrowMarker',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const from = coordinates[0];
      const to = coordinates[1];
      const isUp = to.y < from.y;
      const color = isUp ? '#00c365' : '#ff4954';
      const headSize = 10;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const lx = -uy;
      const ly = ux;
      return [
        { type: 'line', key: 'shaft', attrs: { coordinates: [from, to] }, styles: { style: 'solid', size: 2, color } },
        { type: 'polygon', key: 'head', attrs: { coordinates: [
          to,
          { x: to.x - ux * headSize + lx * headSize * 0.4, y: to.y - uy * headSize + ly * headSize * 0.4 },
          { x: to.x - ux * headSize - lx * headSize * 0.4, y: to.y - uy * headSize - ly * headSize * 0.4 },
        ]}, styles: { style: 'fill', color } },
      ];
    },
  },
];

CUSTOM_OVERLAYS.forEach(o => registerOverlay(o));

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ candles, currentPrice, onOverlaySelected }, ref) {
  const chartIdRef = useRef(`kline-${Math.random().toString(36).slice(2)}`);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChart | null>(null);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const onOverlaySelectedRef = useRef(onOverlaySelected);
  onOverlaySelectedRef.current = onOverlaySelected;

  useImperativeHandle(ref, () => ({
    createOverlay: (name: string, onSelected?: (id: string) => void, onDeselected?: () => void) => {
      chartRef.current?.createOverlay({
        name,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event) => {
          const id = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
          onOverlaySelectedRef.current?.({ id, name });
          onSelected?.(id);
          return true;
        },
        onDeselected: () => {
          onOverlaySelectedRef.current?.(null);
          onDeselected?.();
          return true;
        },
        onRightClick: (event) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      });
    },
    removeOverlay: (id?: string) => {
      if (id) {
        chartRef.current?.removeOverlay({ id });
      }
    },
    removeAllOverlays: () => {
      const chart = chartRef.current;
      if (chart) {
        const overlays = chart.getOverlays({});
        overlays.forEach(o => {
          if (o.id) chart.removeOverlay({ id: o.id });
        });
      }
    },
    overrideOverlay: (id: string, overlay: Record<string, unknown>) => {
      chartRef.current?.overrideOverlay({ id, ...overlay });
    },
    copyOverlay: (id: string) => {
      const chart = chartRef.current;
      if (!chart) return;
      const all = chart.getOverlays({});
      const src = all.find(o => o.id === id);
      if (!src) return;
      const offset = 30;
      const newPoints = (src.points ?? []).map((p: { timestamp?: number; dataIndex?: number; value?: number }) => ({
        ...p,
        timestamp: p.timestamp ? p.timestamp + offset * 60000 : undefined,
        dataIndex: p.dataIndex !== undefined ? p.dataIndex + offset : undefined,
        value: p.value !== undefined ? p.value * 1.02 : undefined,
      }));
      const overlayName = src.name ?? '';
      chart.createOverlay({
        name: overlayName,
        points: newPoints,
        styles: src.styles ? { ...src.styles } : undefined,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event) => {
          const newId = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
          onOverlaySelectedRef.current?.({ id: newId, name: overlayName });
          return true;
        },
        onDeselected: () => {
          onOverlaySelectedRef.current?.(null);
          return true;
        },
        onRightClick: (event) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      });
    },
    getOverlays: () => {
      const chart = chartRef.current;
      if (!chart) return [];
      return chart.getOverlays({}).map(o => ({ id: o.id ?? '', name: o.name ?? '' }));
    },
    getChart: () => chartRef.current,
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = init(chartIdRef.current, { styles: 'dark' });
    chartRef.current = chart;

    if (chart) {
      chart.setSymbol({ name: 'EUR/USD' });
      chart.setPeriod({ span: 1, type: 'minute' });

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
});
