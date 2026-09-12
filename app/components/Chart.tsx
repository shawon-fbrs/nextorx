'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { init, dispose, registerOverlay, getSupportedIndicators as getLibSupportedIndicators, Chart as KLineChart, KLineData } from 'klinecharts';
import { readStoredIndicators } from '@/lib/indicator-store';
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
  watermark?: string | null;
}

export interface ActiveIndicator {
  id: string;
  name: string;
  calcParams: number[];
  visible: boolean;
}

export interface ChartHandle {
  setChartType: (t: 'candle' | 'line' | 'area') => void;
  setTheme: (mode: 'dark' | 'light') => void;
  isAtRealTime: () => boolean;
  scrollToRealTime: (duration?: number) => void;
  getSupportedIndicators: () => string[];
  addIndicator: (name: string, overlay: boolean) => string | null;
  getActiveIndicators: () => ActiveIndicator[];
  overrideIndicatorById: (id: string, patch: { calcParams?: number[]; visible?: boolean; colors?: string[] }) => boolean;
  removeIndicatorById: (id: string) => boolean;
  createOverlay: (name: string, onSelected?: (id: string) => void, onDeselected?: () => void) => string | null;
  drawTradeMarkers: (opts: { entryPrice: number; entryMs: number; endMs?: number; direction: 'up' | 'down' }) => string[];
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
  {
    name: 'demoWatermark',
    totalStep: 1,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ bounding }: {
      coordinates: Array<{ x: number; y: number }>;
      overlay: { points?: Array<{ value?: number; timestamp?: number; dataIndex?: number }> };
      bounding?: { width: number; height: number };
      chart?: { getSymbol?: () => { pricePrecision?: number } | null };
    }) => {
      const b = (bounding ?? {}) as { width?: number; height?: number };
      const w = typeof b.width === 'number' ? b.width : 0;
      const h = typeof b.height === 'number' ? b.height : 0;
      if (w < 50 || h < 50) return [];
      const size = Math.max(48, Math.min(120, Math.floor(Math.min(w, h) / 5)));
      return [
        { type: 'text', key: 'wm', attrs: { x: Math.floor(w / 2), y: Math.floor(h / 2), text: 'DEMO', align: 'center', baseline: 'middle' }, styles: { color: 'rgba(148,163,184,0.16)', size, family: 'Roboto, Arial, sans-serif', weight: 'bold', backgroundColor: 'transparent', borderSize: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 } },
      ];
    },
  },
  {
    name: 'fibBox',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay, chart }: {
      coordinates: Array<{ x: number; y: number }>;
      overlay: { points?: Array<{ value?: number; timestamp?: number; dataIndex?: number }> };
      chart?: { getSymbol?: () => { pricePrecision?: number } | null };
    }) => {
      if (coordinates.length < 2) return [];
      const v0 = overlay.points?.[0]?.value;
      const v1 = overlay.points?.[1]?.value;
      if (typeof v0 !== 'number' || typeof v1 !== 'number' || !Number.isFinite(v0) || !Number.isFinite(v1)) return [];
      const c0 = coordinates[0];
      const c1 = coordinates[1];
      const x0 = Math.min(c0.x, c1.x);
      const x1 = Math.max(c0.x, c1.x);
      if (x1 - x0 < 2) return [];
      const precision = chart?.getSymbol?.()?.pricePrecision ?? 5;
      let labelColor = '#e4e8f0';
      try {
        if (typeof document !== 'undefined' && !document.documentElement.classList.contains('dark')) labelColor = '#0f172a';
      } catch {}
      const percents = [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0];
      const yDif = c0.y - c1.y;
      const valueDif = v0 - v1;
      const figs: Array<{ key: string; type: string; attrs: Record<string, unknown>; styles?: Record<string, unknown> }> = [];
      const yTop = Math.min(c0.y, c1.y);
      const yBottom = Math.max(c0.y, c1.y);
      if (yBottom - yTop > 0) {
        figs.push({ type: 'rect', key: 'fib-bg', attrs: { x: x0, y: yTop, width: x1 - x0, height: yBottom - yTop }, styles: { style: 'stroke_fill', color: 'rgba(0,122,255,0.07)', borderColor: '#007aff', borderSize: 1, borderRadius: 0 } });
      }
      percents.forEach((percent, i) => {
        const y = c1.y + yDif * percent;
        const value = (v1 + valueDif * percent).toFixed(precision);
        figs.push({ type: 'line', key: `fib-line-${i}`, attrs: { coordinates: [{ x: x0, y }, { x: x1, y }] }, styles: { style: 'solid', size: 1, color: 'rgba(0,122,255,0.9)' } });
        figs.push({ type: 'text', key: `fib-text-${i}`, attrs: { x: x1 - 4, y, text: `${value} (${(percent * 100).toFixed(1)}%)`, align: 'right', baseline: 'bottom' }, styles: { color: labelColor, size: 10, backgroundColor: 'transparent', borderSize: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 } });
      });
      return figs;
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

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ pairId, pairName, currentPrice, currentCandle, seed, timeframe = '1m', serverTime = null, onOverlaySelected, onViewChange, watermark = null }, ref) {
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
  const chartTypeRef = useRef<'candle' | 'line' | 'area'>('candle');
  const barsCacheRef = useRef<Map<string, KLineData[]>>(new Map());
  const bucketStartRef = useRef<number | null>(null);
  const bucketBaseRef = useRef<KLineData | null>(null);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tickClock = () => {
      try {
        const now = new Date();
        const t = now.toLocaleTimeString('en-GB', { hour12: false });
        let tz = '';
        try {
          const parts = new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(now);
          tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
        } catch {}
        setClock(tz ? `${t} ${tz}` : t);
      } catch {}
    };
    tickClock();
    const id = setInterval(tickClock, 1000);
    return () => clearInterval(id);
  }, []);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watermarkIdRef = useRef<string | null>(null);

  const ensureWatermark = useCallback((text: string | null) => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const found = (chart.getOverlays({}) ?? []).find(o => o.name === 'demoWatermark');
      if (text) {
        if (found && found.id) {
          watermarkIdRef.current = found.id;
          return;
        }
        const id = chart.createOverlay({
          name: 'demoWatermark',
          lock: true,
          visible: true,
          points: [{ timestamp: Date.now(), value: 0 }],
          needDefaultPointFigure: false,
          needDefaultXAxisFigure: false,
          needDefaultYAxisFigure: false,
        } as never);
        if (typeof id === 'string') watermarkIdRef.current = id;
      } else if (found && found.id) {
        try {
          chart.removeOverlay({ id: found.id });
        } catch {}
        watermarkIdRef.current = null;
      }
    } catch {}
  }, []);

  const cleanPoints = useCallback((pts: unknown): Array<{ timestamp?: number; value?: number }> => {
    const arr = pts as unknown as Array<{ timestamp?: number; value?: number; dataIndex?: number }> | null | undefined;
    if (!Array.isArray(arr)) return [];
    return arr.map(p => {
      const q: { timestamp?: number; value?: number } = {};
      if (typeof p?.timestamp === 'number' && Number.isFinite(p.timestamp)) q.timestamp = p.timestamp;
      if (typeof p?.value === 'number' && Number.isFinite(p.value)) q.value = p.value;
      return q;
    }).filter(p => p.timestamp !== undefined || p.value !== undefined);
  }, []);

  const writeDrawings = useCallback((pid: string | null, tf: string) => {
    try {
      const chart = chartRef.current;
      if (!chart || !pid) return;
      const overlays = chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment' && o.name !== 'demoWatermark');
      const toSave = overlays.map(o => ({
        name: o.name,
        points: (() => {
          const cleaned = cleanPoints((o as unknown as { points?: unknown }).points);
          return cleaned.length ? cleaned : (o as unknown as { points?: unknown }).points;
        })(),
        styles: o.styles,
        lock: (o as unknown as { lock?: boolean }).lock,
        visible: (o as unknown as { visible?: boolean }).visible,
      }));
      const key = storageKey(pid, tf);
      if (toSave.length === 0) {
        try {
          const raw = localStorage.getItem(key);
          if (raw && (JSON.parse(raw) as unknown[]).length > 0) return;
        } catch {}
      }
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch {}
  }, [cleanPoints]);

  const persistDrawings = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      writeDrawings(pairIdRef.current, timeframeRef.current);
    }, 250);
  }, [writeDrawings]);

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
      const existingSig = new Set(existing.map(o => {
        const cleaned = cleanPoints((o as unknown as { points?: unknown }).points);
        return `${o.name}:${JSON.stringify(cleaned)}`;
      }));
      for (const o of arr) {
        if (!o.name || !o.points) continue;
        try {
          const pts = cleanPoints(o.points);
          if (pts.length === 0) continue;
          if (existingSig.has(`${o.name}:${JSON.stringify(pts)}`)) continue;
          existingSig.add(`${o.name}:${JSON.stringify(pts)}`);
          const points = pts;
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

  const applyChartType = useCallback((t: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    if (t === 'candle' || t === 'line' || t === 'area') chartTypeRef.current = t;
    try {
      if (t === 'line') {
        chart.setStyles({
          candle: {
            type: 'area',
            area: {
              lineSize: 2,
              lineColor: '#007aff',
              backgroundColor: [
                { offset: 0, color: 'rgba(0,122,255,0)' },
                { offset: 1, color: 'rgba(0,122,255,0)' },
              ],
            },
          },
        } as never);
      } else if (t === 'area') {
        chart.setStyles({
          candle: {
            type: 'area',
            area: {
              lineSize: 2,
              lineColor: '#007aff',
              backgroundColor: [
                { offset: 0, color: 'rgba(0,122,255,0.01)' },
                { offset: 1, color: 'rgba(0,122,255,0.2)' },
              ],
            },
          },
        } as never);
      } else {
        chart.setStyles({ candle: { type: 'candle_solid' } } as never);
      }
    } catch {}
  }, []);

  const mountStoredIndicators = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const stored = readStoredIndicators();
    if (stored.length === 0) return;
    let existing: Array<{ id?: string; name?: string }> = [];
    try {
      existing = (chart.getIndicators({}) ?? []) as unknown as Array<{ id?: string; name?: string }>;
    } catch {}
    const haveNames = new Set(existing.map(e => e.name).filter((n): n is string => typeof n === 'string'));
    for (const def of stored) {
      if (!def.name || haveNames.has(def.name)) continue;
      try {
        const value: Record<string, unknown> = { name: def.name };
        if (def.calcParams && def.calcParams.length > 0) value.calcParams = [...def.calcParams];
        if (def.visible === false) value.visible = false;
        const overlay = def.overlay === true;
        if (overlay) value.paneId = 'candle_pane';
        const id = chart.createIndicator(value as never, overlay);
        if (typeof id === 'string') {
          haveNames.add(def.name);
          if (def.colors && def.colors.length > 0) {
            chart.overrideIndicator({ id, styles: { lines: def.colors.map(c => ({ color: c })) } } as never);
          }
        }
      } catch {}
    }
  }, []);

  const applyGridForTheme = useCallback((mode: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      if (mode === 'light') {
        chart.setStyles({
          grid: {
            show: true,
            horizontal: { show: true, size: 1, color: '#c3cedb', style: 'dashed', dashedValue: [2, 2] },
            vertical: { show: true, size: 1, color: '#c3cedb', style: 'dashed', dashedValue: [2, 2] },
          },
        } as never);
      }
    } catch {}
  }, []);

  const applyTooltipTemplate = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.setStyles({
        candle: {
          tooltip: {
            title: { show: false },
            legend: { template: [] },
          },
        },
      } as never);
    } catch {}
  }, []);

  useImperativeHandle(ref, () => ({
    setChartType: (t: 'candle' | 'line' | 'area') => { applyChartType(t); },
    setTheme: (mode: 'dark' | 'light') => {
      const chart = chartRef.current;
      if (!chart) return;
      try {
        chart.setStyles(mode === 'light' ? 'light' : 'dark' as never);
      } catch {}
      applyChartType(chartTypeRef.current);
      applyTooltipTemplate();
      applyGridForTheme(mode);
    },
    isAtRealTime: () => {
      try {
        const chart = chartRef.current;
        if (!chart) return true;
        const vr = chart.getVisibleRange() as unknown as { realTo?: number };
        const n = chart.getDataList()?.length ?? 0;
        if (!n) return true;
        return (vr?.realTo ?? n) >= n - 1;
      } catch {
        return true;
      }
    },
    scrollToRealTime: (duration?: number) => {
      try {
        chartRef.current?.scrollToRealTime(duration ?? 200);
      } catch {}
    },
    getSupportedIndicators: () => {
      try {
        return getLibSupportedIndicators() ?? [];
      } catch {
        return [];
      }
    },
    addIndicator: (name: string, overlay: boolean) => {
      try {
        const value: Record<string, unknown> = { name };
        if (overlay) value.paneId = 'candle_pane';
        const id = chartRef.current?.createIndicator(value as never, overlay);
        return typeof id === 'string' ? id : null;
      } catch {
        return null;
      }
    },
    getActiveIndicators: () => {
      try {
        const list = (chartRef.current?.getIndicators({}) ?? []) as unknown as Array<{ id?: string; name?: string; calcParams?: unknown; visible?: boolean }>;
        return list
          .filter(e => typeof e.id === 'string' && typeof e.name === 'string')
          .map(e => ({
            id: e.id as string,
            name: e.name as string,
            calcParams: Array.isArray(e.calcParams) ? (e.calcParams as unknown[]).filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [],
            visible: e.visible !== false,
          }));
      } catch {
        return [];
      }
    },
    overrideIndicatorById: (id: string, patch: { calcParams?: number[]; visible?: boolean; colors?: string[] }) => {
      const chart = chartRef.current;
      if (!chart || !id) return false;
      try {
        if (patch.calcParams !== undefined) {
          chart.overrideIndicator({ id, calcParams: [...patch.calcParams] } as never);
        }
        if (patch.visible !== undefined) {
          chart.overrideIndicator({ id, visible: patch.visible } as never);
        }
        if (patch.colors !== undefined && patch.colors.length > 0) {
          chart.overrideIndicator({ id, styles: { lines: patch.colors.map(c => ({ color: c })) } } as never);
        }
        return true;
      } catch {
        return false;
      }
    },
    removeIndicatorById: (id: string) => {
      try {
        if (!id) return false;
        return !!chartRef.current?.removeIndicator({ id });
      } catch {
        return false;
      }
    },
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
        const toRemove = chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment' && o.name !== 'demoWatermark');
        for (const o of toRemove) { if (o.id) chart.removeOverlay({ id: o.id }); }
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        try {
          const pid = pairIdRef.current;
          if (pid) localStorage.setItem(storageKey(pid, timeframeRef.current), JSON.stringify([]));
        } catch {}
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
      return chart ? chart.getOverlays({}).filter(o => o.name !== 'horizontalSegment' && o.name !== 'demoWatermark').map(o => ({ id: o.id ?? '', name: o.name ?? '' })) : [];
    },
    getChart: () => chartRef.current,
    drawTradeMarkers: (opts: { entryPrice: number; entryMs: number; endMs?: number; direction: 'up' | 'down' }) => {
      const ids: string[] = [];
      try {
        const chart = chartRef.current;
        if (!chart) return ids;
        const color = opts.direction === 'up' ? '#00c365' : '#ff4954';
        const endMs = opts.endMs && opts.endMs > opts.entryMs ? opts.endMs : opts.entryMs + 900000;
        const entryId = chart.createOverlay({
          name: 'horizontalSegment',
          lock: true,
          visible: true,
          points: [
            { timestamp: opts.entryMs, value: opts.entryPrice },
            { timestamp: endMs, value: opts.entryPrice },
          ],
          styles: {
            line: { color, size: 3 },
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
        const stored = localStorage.getItem('nextorx:chart-type');
        if (stored === 'line' || stored === 'area') applyChartType(stored);
      } catch {}
      try {
        const storedTheme = localStorage.getItem('nextorx:theme');
        if (storedTheme === 'light') chart.setStyles('light' as never);
      } catch {}
      applyTooltipTemplate();
      try {
        const storedTheme = localStorage.getItem('nextorx:theme');
        applyGridForTheme(storedTheme === 'light' ? 'light' : 'dark');
      } catch {}
      try {
        const inds = chart.getIndicators({}) as unknown as Array<{ id?: string; name?: string }>;
        for (const ind of inds) {
          if (ind.name === 'VOL' && ind.id) chart.removeIndicator({ id: ind.id });
        }
      } catch {}
      try {
        chart.subscribeAction('onZoom', notifyViewChange);
        chart.subscribeAction('onScroll', notifyViewChange);
        chart.subscribeAction('onVisibleRangeChange', notifyViewChange);
      } catch {}
      mountStoredIndicators();
    }

    const ro = new ResizeObserver(() => { chart?.resize(); });
    ro.observe(chartContainerRef.current);

    const onPageHide = () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      writeDrawings(pairIdRef.current, timeframeRef.current);
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      ro.disconnect();
      try {
        chartRef.current?.unsubscribeAction('onZoom', notifyViewChange);
        chartRef.current?.unsubscribeAction('onScroll', notifyViewChange);
        chartRef.current?.unsubscribeAction('onVisibleRangeChange', notifyViewChange);
      } catch {}
      dispose(chartIdRef.current);
      chartRef.current = null;
    };
  }, [notifyViewChange, mountStoredIndicators]);

  useEffect(() => {
    ensureWatermark(watermark);
    if (!watermark) return;
    const timer = setInterval(() => {
      ensureWatermark(watermark);
    }, 3000);
    return () => clearInterval(timer);
  }, [watermark, ensureWatermark]);

  useEffect(() => {
    if (!pairId) return;
    const prevPid = pairIdRef.current;
    const prevTf = timeframeRef.current;
    if ((prevPid && prevPid !== pairId) || prevTf !== timeframe) {
      writeDrawings(prevPid, prevTf);
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
  }, [pairId, seed, timeframe, restoreDrawings, writeDrawings]);

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
    <div className="absolute inset-0 bg-background overflow-hidden">
      <div ref={chartContainerRef} id={chartIdRef.current} className="absolute inset-0" />
      {clock && (
        <div className="absolute top-2 left-2 z-20 px-2 py-1 rounded-md bg-background/70 backdrop-blur border border-border/50 text-[10px] font-mono font-bold text-foreground tabular-nums pointer-events-none">
          {clock}
        </div>
      )}
    </div>
  );
});
