'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { init, dispose, registerOverlay, Chart as KLineChart, KLineData } from 'klinecharts';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  pairId: string | null;
  pairName: string | null;
  currentPrice: number | null;
  currentCandle: CandleData | null;
  seed: { pairId: string; bars: CandleData[] } | null;
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

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ pairId, pairName, currentPrice, currentCandle, seed, onOverlaySelected }, ref) {
  const chartIdRef = useRef(`kline-${Math.random().toString(36).slice(2)}`);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChart | null>(null);
  const pairIdRef = useRef(pairId);
  const onOverlaySelectedRef = useRef(onOverlaySelected);
  onOverlaySelectedRef.current = onOverlaySelected;
  const subscribeBarCallbackRef = useRef<((data: KLineData) => void) | null>(null);
  const barsCacheRef = useRef<Map<string, KLineData[]>>(new Map());

  const loadBars = async (type: string, timestamp: number | null | undefined, callback: (bars: KLineData[], more: boolean) => void) => {
    const pid = pairIdRef.current;
    if (!pid) {
      callback([], false);
      return;
    }
    if (type === 'init') {
      const cached = barsCacheRef.current.get(pid);
      if (cached && cached.length > 0) {
        callback(cached, false);
        return;
      }
      try {
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=300`);
        const data = await res.json();
        const bars: KLineData[] = (data.candles || []).map((c: any) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Number(c.volume) || 0,
        })).sort((a: KLineData, b: KLineData) => a.timestamp - b.timestamp);
        callback(bars, false);
      } catch {
        callback([], false);
      }
    } else if (type === 'backward' && timestamp) {
      try {
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=100&before=${timestamp}`);
        const data = await res.json();
        const bars: KLineData[] = (data.candles || []).map((c: any) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Number(c.volume) || 0,
        })).sort((a: KLineData, b: KLineData) => a.timestamp - b.timestamp);
        callback(bars, bars.length < 100);
      } catch {
        callback([], true);
      }
    }
  };

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
    removeOverlay: (id?: string) => { if (id) chartRef.current?.removeOverlay({ id }); },
    removeAllOverlays: () => {
      const chart = chartRef.current;
      if (chart) { chart.getOverlays({}).forEach(o => { if (o.id) chart.removeOverlay({ id: o.id }); }); }
    },
    overrideOverlay: (id: string, overlay: Record<string, unknown>) => { chartRef.current?.overrideOverlay({ id, ...overlay }); },
    copyOverlay: (id: string) => {
      const chart = chartRef.current;
      if (!chart) return;
      const src = chart.getOverlays({}).find(o => o.id === id);
      if (!src) return;
      const offset = 30;
      const newPoints = (src.points ?? []).map((p: { timestamp?: number; dataIndex?: number; value?: number }) => ({
        ...p,
        timestamp: p.timestamp ? p.timestamp + offset * 60000 : undefined,
        dataIndex: p.dataIndex !== undefined ? p.dataIndex + offset : undefined,
        value: p.value !== undefined ? p.value * 1.02 : undefined,
      }));
      chart.createOverlay({
        name: src.name ?? '',
        points: newPoints,
        styles: src.styles ? { ...src.styles } : undefined,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event) => {
          const newId = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
          onOverlaySelectedRef.current?.({ id: newId, name: src.name ?? '' });
          return true;
        },
        onDeselected: () => { onOverlaySelectedRef.current?.(null); return true; },
        onRightClick: (event) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      });
    },
    getOverlays: () => {
      const chart = chartRef.current;
      return chart ? chart.getOverlays({}).map(o => ({ id: o.id ?? '', name: o.name ?? '' })) : [];
    },
    getChart: () => chartRef.current,
  }));

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = init(chartIdRef.current, { styles: 'dark' });
    chartRef.current = chart;

    if (chart) {
      const pricePrec = pairIdRef.current?.includes('JPY') ? 3 : 5;
      chart.setSymbol({ ticker: pairIdRef.current || 'OTC', pricePrecision: pricePrec, volumePrecision: 0 });
      chart.setPeriod({ span: 1, type: 'minute' });

      chart.setDataLoader({
        getBars: async ({ type, timestamp, callback }) => {
          await loadBars(type, timestamp, callback);
        },
        subscribeBar: ({ callback }) => {
          subscribeBarCallbackRef.current = callback;
        },
        unsubscribeBar: () => {
          subscribeBarCallbackRef.current = null;
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
      subscribeBarCallbackRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pairId) {
      pairIdRef.current = pairId;
      const chart = chartRef.current;
      if (chart && chartContainerRef.current) {
        if (seed && seed.pairId === pairId && seed.bars.length > 0) {
          const pricePrec = pairId.includes('JPY') ? 3 : 5;
          chart.setSymbol({ ticker: pairId, pricePrecision: pricePrec, volumePrecision: 0 });
          barsCacheRef.current.set(
            pairId,
            seed.bars.map((c) => ({
              timestamp: c.timestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: Number(c.volume) || 0,
            })),
          );
          subscribeBarCallbackRef.current = null;
          chart.resetData();
          chart.scrollToRealTime(0);
        }
      }
    }
  }, [pairId, seed]);

  useEffect(() => {
    if (!currentCandle) return;
    const cb = subscribeBarCallbackRef.current;
    if (cb) {
      cb({
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume,
      });
    }
  }, [currentCandle]);

  return (
    <div className="absolute inset-0 bg-[#161a22] overflow-hidden">
      <div ref={chartContainerRef} id={chartIdRef.current} className="absolute inset-0" />
    </div>
  );
});
