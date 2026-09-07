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
  timeframe?: string;
  onOverlaySelected?: (overlay: { id: string; name: string } | null) => void;
}

export interface ChartHandle {
  createOverlay: (name: string, onSelected?: (id: string) => void, onDeselected?: () => void) => string | null;
  drawTradeMarkers: (opts: { entryPrice: number; entryMs: number; direction: 'up' | 'down' }) => string[];
  removeOverlay: (id?: string) => void;
  removeAllOverlays: () => void;
  overrideOverlay: (id: string, overlay: Record<string, unknown>) => void;
  copyOverlay: (id: string) => void;
  getOverlays: () => Array<{ id: string; name: string }>;
  getChart: () => KLineChart | null;
  getYPixel: (price: number) => number | null;
  chartPixel: (timestamp: number, price: number) => { x: number; y: number } | null;
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

const PERIOD_MAP: Record<string, { span: number; type: 'minute' | 'hour' | 'day' }> = {
  '1m': { span: 1, type: 'minute' },
  '5m': { span: 5, type: 'minute' },
  '15m': { span: 15, type: 'minute' },
  '30m': { span: 30, type: 'minute' },
  '1h': { span: 1, type: 'hour' },
  '4h': { span: 4, type: 'hour' },
  '1d': { span: 1, type: 'day' },
};

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ pairId, pairName, currentPrice, currentCandle, seed, timeframe = '1m', onOverlaySelected }, ref) {
  const chartIdRef = useRef(`kline-${Math.random().toString(36).slice(2)}`);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChart | null>(null);
  const pairIdRef = useRef(pairId);
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;
  const onOverlaySelectedRef = useRef(onOverlaySelected);
  onOverlaySelectedRef.current = onOverlaySelected;
  const subscribeBarCallbackRef = useRef<((data: KLineData) => void) | null>(null);
  const barsCacheRef = useRef<Map<string, KLineData[]>>(new Map());
  const bucketStartRef = useRef<number | null>(null);
  const bucketBaseRef = useRef<KLineData | null>(null);

  const loadBars = async (type: string, timestamp: number | null | undefined, callback: (bars: KLineData[], more: boolean) => void) => {
    const pid = pairIdRef.current;
    const tf = timeframeRef.current;
    if (!pid) {
      callback([], false);
      return;
    }
    if (type === 'init') {
      const cacheKey = `${pid}:${tf}`;
      const cached = barsCacheRef.current.get(cacheKey);
      if (cached && cached.length > 0) {
        callback(cached, false);
        return;
      }
      try {
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=300&interval=${encodeURIComponent(tf)}`);
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
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=100&before=${timestamp}&interval=${encodeURIComponent(tf)}`);
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
      const id = chartRef.current?.createOverlay({
        name,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event) => {
          const oid = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
          onOverlaySelectedRef.current?.({ id: oid, name });
          onSelected?.(oid);
          return true;
        },
        onDeselected: () => {
          onOverlaySelectedRef.current?.(null);
          onDeselected?.();
          return true;
        },
        onRightClick: (event) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      });
      return typeof id === 'string' ? id : null;
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
    drawTradeMarkers: (opts: { entryPrice: number; entryMs: number; direction: 'up' | 'down' }) => {
      const ids: string[] = [];
      try {
        const chart = chartRef.current;
        if (!chart) return ids;
        const color = opts.direction === 'up' ? '#00c365' : '#ff4954';
        const entryId = chart.createOverlay({
          name: 'horizontalSegment',
          lock: true,
          visible: true,
          points: [
            { timestamp: opts.entryMs, value: opts.entryPrice },
            { timestamp: opts.entryMs + 3600000, value: opts.entryPrice },
          ],
          styles: {
            line: { color, size: 2 },
            yAxis: { color, backgroundColor: color, size: 12 },
          },
          needDefaultPointFigure: false,
          needDefaultXAxisFigure: false,
          needDefaultYAxisFigure: true,
        } as never);
        if (typeof entryId === 'string') ids.push(entryId);
      } catch {
      }
      return ids;
    },
    getYPixel: (price: number) => {
      try {
        const chart = chartRef.current;
        if (!chart) return null;
        const axes = chart.getYAxes({});
        const y = axes?.[0]?.convertToPixel(price);
        return typeof y === 'number' && Number.isFinite(y) ? y : null;
      } catch {
        return null;
      }
    },
    chartPixel: (timestamp: number, price: number) => {
      try {
        const chart = chartRef.current;
        if (!chart) return null;
        const out = chart.convertToPixel({ timestamp, value: price });
        const pt = Array.isArray(out) ? out[0] : out;
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return null;
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
        return { x: pt.x, y: pt.y };
      } catch {
        return null;
      }
    },
  }));

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = init(chartIdRef.current, { styles: 'dark' });
    chartRef.current = chart;

    if (chart) {
      const pricePrec = pairIdRef.current?.includes('JPY') ? 3 : 5;
      const p = PERIOD_MAP[timeframeRef.current] ?? PERIOD_MAP['1m'];
      chart.setSymbol({ ticker: pairIdRef.current || 'OTC', pricePrecision: pricePrec, volumePrecision: 0 });
      chart.setPeriod(p as never);

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
      timeframeRef.current = timeframe;
      bucketStartRef.current = null;
      bucketBaseRef.current = null;
      const chart = chartRef.current;
      if (chart && chartContainerRef.current) {
        const pricePrec = pairId.includes('JPY') ? 3 : 5;
        const p = PERIOD_MAP[timeframe] ?? PERIOD_MAP['1m'];
        chart.setSymbol({ ticker: pairId, pricePrecision: pricePrec, volumePrecision: 0 });
        chart.setPeriod(p as never);
        if (seed && seed.pairId === pairId && seed.bars.length > 0) {
          const cacheKey = `${pairId}:${timeframe}`;
          barsCacheRef.current.set(
            cacheKey,
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
        } else {
          chart.resetData();
          chart.scrollToRealTime(0);
        }
      }
    }
  }, [pairId, seed, timeframe]);

  useEffect(() => {
    if (!currentCandle) return;
    const cb = subscribeBarCallbackRef.current;
    if (!cb) return;
    if (timeframe === '1m') {
      bucketStartRef.current = null;
      bucketBaseRef.current = null;
      cb({
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume,
      });
      return;
    }
    const msMap: Record<string, number> = { '1m': 60000, '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
    const intervalMs = msMap[timeframe] ?? 60000;
    const bucketStart = Math.floor(currentCandle.timestamp / intervalMs) * intervalMs;
    if (bucketStartRef.current !== bucketStart) {
      bucketStartRef.current = bucketStart;
      const cacheKey = `${pairIdRef.current}:${timeframeRef.current}`;
      const cached = barsCacheRef.current.get(cacheKey);
      const last = cached?.[cached.length - 1];
      if (last && last.timestamp === bucketStart) {
        bucketBaseRef.current = { ...last };
      } else {
        bucketBaseRef.current = {
          timestamp: bucketStart,
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
          volume: 0,
        };
      }
    }
    const base = bucketBaseRef.current;
    if (!base) return;
    const bar: KLineData = {
      timestamp: bucketStart,
      open: base.open,
      high: Math.max(base.high, currentCandle.high),
      low: Math.min(base.low, currentCandle.low),
      close: currentCandle.close,
      volume: (base.volume || 0) + (currentCandle.volume || 0),
    };
    bucketBaseRef.current = { ...bar };
    cb(bar);
  }, [currentCandle, timeframe]);

  return (
    <div className="absolute inset-0 bg-[#161a22] overflow-hidden">
      <div ref={chartContainerRef} id={chartIdRef.current} className="absolute inset-0" />
    </div>
  );
});
