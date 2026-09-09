'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { init, dispose, registerOverlay, Chart as KLineChart, KLineData } from 'klinecharts';
import { getServerNow, syncWithServer } from '@/lib/server-time';

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
  serverTime?: number | null;
  onOverlaySelected?: (overlay: { id: string; name: string } | null) => void;
  onViewChange?: () => void;
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

const PERIOD_MAP: Record<string, { span: number; type: 'second' | 'minute' | 'hour' }> = {
  '5s': { span: 5, type: 'second' },
  '30s': { span: 30, type: 'second' },
  '1m': { span: 1, type: 'minute' },
  '5m': { span: 5, type: 'minute' },
  '15m': { span: 15, type: 'minute' },
  '30m': { span: 30, type: 'minute' },
  '1h': { span: 1, type: 'hour' },
  '4h': { span: 4, type: 'hour' },
};

const INTERVAL_MS_MAP: Record<string, number> = {
  '5s': 5_000,
  '30s': 30_000,
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
};

function storageKey(pairId: string, timeframe: string): string {
  return `nextorx:drawings:${pairId}:${timeframe}`;
}

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ pairId, pairName, currentPrice, currentCandle, seed, timeframe = '1m', serverTime = null, onOverlaySelected, onViewChange }, ref) {
  const chartIdRef = useRef(`kline-${Math.random().toString(36).slice(2)}`);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<KLineChart | null>(null);
  const pairIdRef = useRef(pairId);
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;
  pairIdRef.current = pairId ?? pairIdRef.current;
  const onOverlaySelectedRef = useRef(onOverlaySelected);
  onOverlaySelectedRef.current = onOverlaySelected;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const notifyViewChange = useCallback(() => {
    try { onViewChangeRef.current?.(); } catch {}
  }, []);
  const subscribeBarCallbackRef = useRef<((data: KLineData) => void) | null>(null);
  const barsCacheRef = useRef<Map<string, KLineData[]>>(new Map());
  const bucketStartRef = useRef<number | null>(null);
  const bucketBaseRef = useRef<KLineData | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistDrawings = useCallback(() => {
    try {
      const chart = chartRef.current;
      const pid = pairIdRef.current;
      const tf = timeframeRef.current;
      if (!chart || !pid) return;
      const overlays = chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment');
      const toSave = overlays.map(o => {
        const rawPoints = (o as unknown as { points?: Array<{ timestamp?: number; value?: number; dataIndex?: number }> }).points ?? [];
        const points = rawPoints.map(p => {
          const q: Record<string, unknown> = {};
          if (typeof p.timestamp === 'number' && Number.isFinite(p.timestamp)) q.timestamp = p.timestamp;
          if (typeof p.value === 'number' && Number.isFinite(p.value)) q.value = p.value;
          return q;
        }).filter(p => p.timestamp !== undefined || p.value !== undefined);
        return {
          name: o.name,
          points: points.length ? points : o.points,
          styles: o.styles,
          lock: (o as unknown as { lock?: boolean }).lock,
          visible: (o as unknown as { visible?: boolean }).visible,
        };
      });
      localStorage.setItem(storageKey(pid, tf), JSON.stringify(toSave));
    } catch {}
  }, []);

  const restoreDrawings = useCallback(() => {
    try {
      const chart = chartRef.current;
      const pid = pairIdRef.current;
      const tf = timeframeRef.current;
      if (!chart || !pid) return;
      const raw = localStorage.getItem(storageKey(pid, tf));
      if (!raw) return;
      const arr = JSON.parse(raw) as Array<{ name: string; points: unknown; styles: unknown; lock?: boolean; visible?: boolean }>;
      if (!Array.isArray(arr) || arr.length === 0) return;
      const existing = chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment');
      if (existing.length > 0) {
        const existingSig = new Set(existing.map(o => `${o.name}:${JSON.stringify(o.points)}`));
        const toRestoreSig = new Set(arr.filter(o => o.name && o.points).map(o => {
          const pts = o.points as unknown as Array<{ timestamp?: number; value?: number }>;
          const clean = Array.isArray(pts) ? pts.map(p => ({ timestamp: p?.timestamp, value: p?.value })) : [];
          return `${o.name}:${JSON.stringify(clean)}`;
        }));
        const already = [...toRestoreSig].every(s => existingSig.has(s)) && existing.length === arr.length;
        if (already) return;
        for (const o of existing) { if (o.id) try { chart.removeOverlay({ id: o.id }); } catch {} }
      }
      for (const o of arr) {
        if (!o.name || !o.points) continue;
        try {
          const rawPts = o.points as unknown as Array<{ timestamp?: number; value?: number; dataIndex?: number }>;
          const pts = Array.isArray(rawPts) ? rawPts.map(p => {
            const q: Record<string, unknown> = {};
            if (typeof p?.timestamp === 'number' && Number.isFinite(p.timestamp)) q.timestamp = p.timestamp;
            if (typeof p?.value === 'number' && Number.isFinite(p.value)) q.value = p.value;
            return q;
          }).filter(p => p.timestamp !== undefined || p.value !== undefined) : rawPts as unknown;
          const points = (pts as unknown as Array<Record<string,unknown>>).length ? pts : rawPts;
          chart.createOverlay({
            name: o.name,
            points: points as never,
            styles: o.styles as never,
            lock: o.lock,
            visible: o.visible,
            needDefaultPointFigure: true,
            needDefaultXAxisFigure: true,
            needDefaultYAxisFigure: true,
            onSelected: (event: any) => {
              const oid = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
              onOverlaySelectedRef.current?.({ id: oid, name: o.name });
              return true;
            },
            onDeselected: () => {
              onOverlaySelectedRef.current?.(null);
              return true;
            },
            onDrawEnd: () => persistDrawings(),
            onRemoved: () => persistDrawings(),
            onPressedMoveEnd: () => persistDrawings(),
          } as never);
        } catch {}
      }
    } catch {}
  }, [persistDrawings]);

  const loadBars = async (type: string, timestamp: number | null | undefined, callback: (bars: KLineData[], more?: boolean | { backward?: boolean; forward?: boolean }) => void) => {
    const pid = pairIdRef.current;
    const tf = timeframeRef.current;
    if (!pid) {
      callback([], { backward: false, forward: false });
      return;
    }
    const toBars = (candles: any): KLineData[] =>
      (candles || []).map((c: any) => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: Number(c.volume) || 0,
      })).sort((a: KLineData, b: KLineData) => a.timestamp - b.timestamp);
    if (type === 'init') {
      const cacheKey = `${pid}:${tf}`;
      const cached = barsCacheRef.current.get(cacheKey);
      if (cached && cached.length > 0) {
        callback(cached, { backward: false, forward: true });
        return;
      }
      try {
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=300&interval=${encodeURIComponent(tf)}`);
        const data = await res.json();
        const bars = toBars(data.candles);
        barsCacheRef.current.set(cacheKey, bars);
        callback(bars, { backward: false, forward: true });
      } catch {
        callback([], { backward: false, forward: true });
      }
    } else if (type === 'forward' && timestamp) {
      try {
        const res = await fetch(`/api/market/pairs/${pid}/candles?limit=200&before=${timestamp}&interval=${encodeURIComponent(tf)}`);
        const data = await res.json();
        const bars = toBars(data.candles).filter((b) => b.timestamp < timestamp);
        callback(bars, { backward: false, forward: bars.length >= 200 });
      } catch {
        callback([], { backward: false, forward: true });
      }
    } else if (type === 'backward') {
      callback([], { backward: false });
    } else {
      callback([], { backward: false, forward: false });
    }
  };

  useImperativeHandle(ref, () => ({
    createOverlay: (name: string, onSelected?: (id: string) => void, onDeselected?: () => void) => {
      const id = chartRef.current?.createOverlay({
        name,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event: any) => {
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
        onDrawEnd: () => { setTimeout(persistDrawings, 50); return true; },
        onRemoved: () => { setTimeout(persistDrawings, 50); return true; },
        onPressedMoveEnd: () => { setTimeout(persistDrawings, 50); return true; },
        onRightClick: (event: any) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      } as never);
      setTimeout(persistDrawings, 150);
      return typeof id === 'string' ? id : null;
    },
    removeOverlay: (id?: string) => {
      if (id) chartRef.current?.removeOverlay({ id });
      setTimeout(persistDrawings, 50);
    },
    removeAllOverlays: () => {
      const chart = chartRef.current;
      if (chart) {
        const toRemove = chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment');
        for (const o of toRemove) { if (o.id) chart.removeOverlay({ id: o.id }); }
        setTimeout(persistDrawings, 50);
      }
    },
    overrideOverlay: (id: string, overlay: Record<string, unknown>) => {
      chartRef.current?.overrideOverlay({ id, ...overlay } as never);
      setTimeout(persistDrawings, 50);
    },
    copyOverlay: (id: string) => {
      const chart = chartRef.current;
      if (!chart) return;
      const src = chart.getOverlays({}).find(o => o.id === id);
      if (!src) return;
      const tf = timeframeRef.current;
      const intervalMs = INTERVAL_MS_MAP[tf] ?? 60_000;
      const tsOffset = Math.max(intervalMs * 8, 60_000 * 3);
      const priceOffsetFactor = 1.002;
      const newPoints = (src.points ?? []).map((p: { timestamp?: number; value?: number }) => ({
        timestamp: p.timestamp ? p.timestamp + tsOffset : undefined,
        value: p.value !== undefined ? (p.value >= 0 ? p.value * priceOffsetFactor : p.value * (2 - priceOffsetFactor)) : undefined,
      }));
      const newId = chart.createOverlay({
        name: src.name ?? '',
        points: newPoints as never,
        styles: src.styles ? { ...(src.styles as object) } : undefined,
        lock: (src as unknown as { lock?: boolean }).lock,
        visible: (src as unknown as { visible?: boolean }).visible,
        needDefaultPointFigure: true,
        needDefaultXAxisFigure: true,
        needDefaultYAxisFigure: true,
        onSelected: (event: any) => {
          const newOid = (event as { overlay?: { id?: string } }).overlay?.id ?? '';
          onOverlaySelectedRef.current?.({ id: newOid, name: src.name ?? '' });
          return true;
        },
        onDeselected: () => { onOverlaySelectedRef.current?.(null); return true; },
        onDrawEnd: () => { setTimeout(persistDrawings, 50); return true; },
        onRemoved: () => { setTimeout(persistDrawings, 50); return true; },
        onPressedMoveEnd: () => { setTimeout(persistDrawings, 50); return true; },
        onRightClick: (event: any) => { (event as { preventDefault?: () => void }).preventDefault?.(); return true; },
      } as never);
      setTimeout(persistDrawings, 100);
      if (typeof newId === 'string') {
        setTimeout(() => {
          onOverlaySelectedRef.current?.({ id: newId, name: src.name ?? '' });
        }, 80);
      }
    },
    getOverlays: () => {
      const chart = chartRef.current;
      return chart ? chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment').map(o => ({ id: o.id ?? '', name: o.name ?? '' })) : [];
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
    void syncWithServer();
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
        },
      });

      chart.resetData();
      chart.setBarSpace(6);
      chart.scrollToRealTime(0);
      try {
        chart.subscribeAction('onZoom', notifyViewChange);
        chart.subscribeAction('onScroll', notifyViewChange);
        chart.subscribeAction('onVisibleRangeChange', notifyViewChange);
      } catch {}
    }

    const ro = new ResizeObserver(() => { chart?.resize(); });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      try {
        chartRef.current?.unsubscribeAction('onZoom', notifyViewChange);
        chartRef.current?.unsubscribeAction('onScroll', notifyViewChange);
        chartRef.current?.unsubscribeAction('onVisibleRangeChange', notifyViewChange);
      } catch {}
      dispose(chartIdRef.current);
      chartRef.current = null;
    };
  }, [notifyViewChange]);

  useEffect(() => {
    if (!pairId) return;
    const prevPid = pairIdRef.current;
    const prevTf = timeframeRef.current;
    if (prevPid && prevPid !== pairId) {
      persistDrawings();
    } else if (prevTf !== timeframe) {
      persistDrawings();
    }
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
        chart.resetData();
        chart.scrollToRealTime(0);
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = setTimeout(() => {
          restoreDrawings();
        }, 180);
      } else {
        chart.resetData();
        chart.scrollToRealTime(0);
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = setTimeout(() => {
          const cacheKey = `${pairId}:${timeframe}`;
          if (!barsCacheRef.current.has(cacheKey)) {
            // no seed yet, still restore drawings after load will happen on next seed; keep placeholder
          }
          restoreDrawings();
        }, 250);
      }
    }
    return () => {
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    };
  }, [pairId, seed, timeframe, restoreDrawings, persistDrawings]);

  useEffect(() => {
    if (!currentCandle) return;
    const chart = chartRef.current;
    const tf = timeframeRef.current;
    const intervalMs = INTERVAL_MS_MAP[tf] ?? 60_000;
    const price = currentPrice ?? currentCandle.close;

    const pushBar = (bar: KLineData) => {
      const cb = subscribeBarCallbackRef.current;
      if (cb) {
        try { cb(bar); } catch {}
      }
    };

    if (tf === '1m') {
      bucketStartRef.current = null;
      bucketBaseRef.current = null;
      pushBar({
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume,
      });
      return;
    }

    const nowServer = serverTime ?? getServerNow();
    let bucketStart: number;
    if (intervalMs < 60_000) {
      bucketStart = Math.floor(nowServer / intervalMs) * intervalMs;
    } else {
      bucketStart = Math.floor(currentCandle.timestamp / intervalMs) * intervalMs;
    }

    if (bucketStartRef.current !== bucketStart) {
      bucketStartRef.current = bucketStart;
      const cacheKey = `${pairIdRef.current}:${tf}`;
      const cached = barsCacheRef.current.get(cacheKey);
      const last = cached?.[cached.length - 1];
      if (last && last.timestamp === bucketStart) {
        bucketBaseRef.current = { ...last };
      } else if (bucketBaseRef.current && bucketBaseRef.current.timestamp === bucketStart) {
        // keep existing
      } else {
        const openPrice = last ? Number(last.close) : price;
        const isSubMinute = intervalMs < 60_000;
        const initHigh = isSubMinute ? Math.max(openPrice, price) : Math.max(openPrice, price, currentCandle.high);
        const initLow = isSubMinute ? Math.min(openPrice, price) : Math.min(openPrice, price, currentCandle.low);
        bucketBaseRef.current = {
          timestamp: bucketStart,
          open: openPrice,
          high: initHigh,
          low: initLow,
          close: price,
          volume: last ? Number(last.volume) || 0 : 0,
        };
      }
    }
    const base = bucketBaseRef.current;
    if (!base) return;
    const isSubMinute = intervalMs < 60_000;
    const bar: KLineData = {
      timestamp: bucketStart,
      open: base.open,
      high: isSubMinute ? Math.max(base.high, price) : Math.max(base.high, price, currentCandle.high),
      low: isSubMinute ? Math.min(base.low, price) : Math.min(base.low, price, currentCandle.low),
      close: price,
      volume: (base.volume || 0) + 0.15,
    };
    bucketBaseRef.current = { ...bar };
    pushBar(bar);
  }, [currentCandle, currentPrice, timeframe, serverTime]);

  return (
    <div className="absolute inset-0 bg-[#161a22] overflow-hidden">
      <div ref={chartContainerRef} id={chartIdRef.current} className="absolute inset-0" />
    </div>
  );
});
