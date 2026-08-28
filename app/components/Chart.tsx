'use client';

import { useState, useRef, useEffect } from 'react';

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartProps {
  candles: Candle[];
  currentPrice: number;
  onDrawToggle?: () => void;
  drawOpen?: boolean;
  onIndToggle?: () => void;
  indOpen?: boolean;
  investment?: number;
  setInvestment?: (v: number) => void;
  payoutAmount?: string;
  onTrade?: (type: 'up' | 'down') => void;
  symbolName?: string;
  payoutPercent?: number;
  timeStr?: string;
  onTimeChange?: (delta: number) => void;
}

const timeframes = [
  { label: '5s', value: '5s', category: 'seconds' },
  { label: '10s', value: '10s', category: 'seconds' },
  { label: '15s', value: '15s', category: 'seconds' },
  { label: '30s', value: '30s', category: 'seconds' },
  { label: '1m', value: '1m', category: 'minutes' },
  { label: '2m', value: '2m', category: 'minutes' },
  { label: '3m', value: '3m', category: 'minutes' },
  { label: '5m', value: '5m', category: 'minutes' },
  { label: '10m', value: '10m', category: 'minutes' },
  { label: '15m', value: '15m', category: 'minutes' },
  { label: '30m', value: '30m', category: 'minutes' },
  { label: '1h', value: '1h', category: 'hours' },
  { label: '2h', value: '2h', category: 'hours' },
  { label: '4h', value: '4h', category: 'hours' },
];

export function Chart({ candles, currentPrice, onDrawToggle, drawOpen = false, onIndToggle, indOpen = false, investment = 1, setInvestment, payoutAmount = '0', onTrade, symbolName = '', payoutPercent = 0, timeStr = '01:00', onTimeChange }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState('1m');
  const [tfOpen, setTfOpen] = useState(false);
  const [tfClosing, setTfClosing] = useState(false);
  const [candleType, setCandleType] = useState('Candles');
  const [ctOpen, setCtOpen] = useState(false);
  const [ctClosing, setCtClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleTfToggle = () => {
    if (tfOpen) {
      setTfClosing(true);
      setTimeout(() => { setTfOpen(false); setTfClosing(false); }, 200);
    } else {
      setTfOpen(true);
      setTfClosing(false);
    }
  };

  const handleTfSelect = (val: string) => {
    setTimeframe(val);
    setTfClosing(true);
    setTimeout(() => { setTfOpen(false); setTfClosing(false); }, 200);
  };

  const handleCtToggle = () => {
    if (ctOpen) {
      setCtClosing(true);
      setTimeout(() => { setCtOpen(false); setCtClosing(false); }, 200);
    } else {
      setCtOpen(true);
      setCtClosing(false);
    }
  };

  const handleCtSelect = (val: string) => {
    setCandleType(val);
    setCtClosing(true);
    setTimeout(() => { setCtOpen(false); setCtClosing(false); }, 200);
  };

  const handleDrawToggle = () => {
    setTfOpen(false);
    setCtOpen(false);
    onDrawToggle?.();
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      chartRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const candleTypes = [
    { label: 'Candles', icon: 'candles' },
    { label: 'Hollow Candles', icon: 'hollow' },
    { label: 'Heikin Ashi', icon: 'heikin' },
    { label: 'Line', icon: 'line' },
    { label: 'Area', icon: 'area' },
    { label: 'Bar', icon: 'bar' },
  ];
  if (candles.length === 0) {
    return <div className="absolute inset-0 bg-[#161a22]" />;
  }

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 0.001;

  const priceLabels = [];
  for (let i = 0; i <= 8; i++) {
    priceLabels.push(minP + (range * i) / 8);
  }

  const viewW = 1000;
  const viewH = 500;
  const padL = 10;
  const padR = 70;
  const padT = 40;
  const padB = 40;
  const plotW = viewW - padL - padR;
  const plotH = viewH - padT - padB;

  const toX = (i: number) => padL + (i / (candles.length - 1)) * plotW;
  const toY = (p: number) => padT + (1 - (p - minP) / range) * plotH;

  const candleW = Math.max(2, Math.min(8, (plotW / candles.length) * 0.6));

  const lastCandle = candles[candles.length - 1];
  const priceY = toY(currentPrice);

  return (
    <div ref={chartRef} className="absolute inset-0 bg-[#161a22]">
      <svg width="100%" height="100%" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {/* Grid */}
        {priceLabels.map((p, i) => (
          <line key={`h${i}`} x1={padL} y1={toY(p)} x2={viewW - padR} y2={toY(p)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => {
          const x = padL + (plotW * i) / 11;
          return <line key={`v${i}`} x1={x} y1={padT} x2={x} y2={viewH - padB} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
        })}

        {/* Candles */}
        {candles.map((c, i) => {
          const x = toX(i);
          const yO = toY(c.open);
          const yC = toY(c.close);
          const yH = toY(c.high);
          const yL = toY(c.low);
          const isUp = c.close >= c.open;
          const color = isUp ? '#00c365' : '#ff4954';
          return (
            <g key={i}>
              <line x1={x} y1={yH} x2={x} y2={yL} stroke={color} strokeWidth="1.2" />
              <rect x={x - candleW / 2} y={Math.min(yO, yC)} width={candleW} height={Math.max(1, Math.abs(yC - yO))} fill={color} rx="1" />
            </g>
          );
        })}

        {/* Price labels */}
        {priceLabels.map((p, i) => (
          <text key={`pl${i}`} x={viewW - padR + 8} y={toY(p) + 4} fill="#5c677f" fontSize="10" fontFamily="monospace">{p.toFixed(5)}</text>
        ))}

        {/* Current price line */}
        <line x1={padL} y1={priceY} x2={viewW - padR} y2={priceY} stroke="#93a0b5" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5" />

        {/* Price label */}
        <rect x={viewW - padR - 55} y={priceY - 10} width={50} height={20} fill="#007aff" rx="4" />
        <text x={viewW - padR - 30} y={priceY + 4} fill="white" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{currentPrice.toFixed(5)}</text>
      </svg>

      {/* Chart info rows */}
      <div style={{ position: 'absolute', top: 64, left: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
        {/* Row 1: Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'monospace' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c365' }} />
          <span style={{ color: '#93a0b5' }}>{new Date().toUTCString().slice(17, 25)} UTC</span>
          <span style={{ color: '#5c677f' }}>|</span>
          <span style={{ color: '#5c677f' }}>EUR/USD</span>
        </div>
        {/* Row 2: OHLC */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: 'monospace' }}>
          <span style={{ color: '#5c677f' }}>O <span style={{ color: '#fff' }}>{lastCandle.open.toFixed(5)}</span></span>
          <span style={{ color: '#5c677f' }}>H <span style={{ color: '#00c365' }}>{lastCandle.high.toFixed(5)}</span></span>
          <span style={{ color: '#5c677f' }}>L <span style={{ color: '#ff4954' }}>{lastCandle.low.toFixed(5)}</span></span>
          <span style={{ color: '#5c677f' }}>C <span style={{ color: '#fff' }}>{lastCandle.close.toFixed(5)}</span></span>
        </div>
        {/* Row 3: Pair info */}
        <div>
          <button style={{ background: 'rgba(36,42,56,0.8)', border: '1px solid #31394c', color: '#007aff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            PAIR INFO
          </button>
        </div>
      </div>

      {/* Trade lines */}
      <div style={{ position: 'absolute', top: 96, bottom: 40, left: '62%', width: 1, borderLeft: '1px dashed rgba(147,160,181,0.3)', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -10, left: -16, fontSize: 9, color: 'rgba(147,160,181,0.6)', whiteSpace: 'nowrap', background: 'rgba(26,30,40,0.6)', padding: '1px 4px', borderRadius: 3 }}>Entry</div>
      </div>
      <div style={{ position: 'absolute', top: 96, bottom: 40, left: '63%', width: 1, background: 'rgba(255,73,84,0.3)', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -10, left: -16, fontSize: 9, color: 'rgba(147,160,181,0.6)', whiteSpace: 'nowrap', background: 'rgba(26,30,40,0.6)', padding: '1px 4px', borderRadius: 3 }}>End</div>
      </div>

      {/* Left toolbar */}
      <div style={{ position: 'absolute', bottom: 40, left: 12, display: 'flex', flexDirection: 'column', gap: 2, background: '#242a38', border: '1px solid #31394c', borderRadius: 10, padding: 4, zIndex: 20 }}>
        {/* Drawing tools */}
        <button title="Drawing Tools" onClick={handleDrawToggle} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: drawOpen ? '#fff' : '#93a0b5', background: drawOpen ? '#2a3142' : 'transparent', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { if (!drawOpen) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={(e) => { if (!drawOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Time frame */}
        <div style={{ position: 'relative' }}>
          <button title="Timeframe" onClick={handleTfToggle} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: tfOpen ? '#2a3142' : 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { if (!tfOpen) e.currentTarget.style.background = '#2a3142'; }}
            onMouseLeave={(e) => { if (!tfOpen) e.currentTarget.style.background = 'transparent'; }}>
            {timeframe}
          </button>
        </div>

        <div style={{ width: 28, height: 1, background: '#31394c', margin: '2px auto' }} />

        {/* Candlestick type */}
        <button title="Candlestick" onClick={handleCtToggle} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00c365', background: ctOpen ? '#2a3142' : 'transparent', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { if (!ctOpen) e.currentTarget.style.background = '#2a3142'; }}
          onMouseLeave={(e) => { if (!ctOpen) e.currentTarget.style.background = 'transparent'; }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="3" height="10" rx="1" />
            <rect x="7" y="1" width="3" height="14" rx="1" opacity="0.4" />
            <rect x="12" y="5" width="3" height="6" rx="1" />
          </svg>
        </button>

        {/* Indicators */}
        <button title="Indicators" onClick={onIndToggle} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: indOpen ? '#fff' : '#93a0b5', background: indOpen ? '#2a3142' : 'transparent', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { if (!indOpen) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={(e) => { if (!indOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M7 12l3-3 3 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ width: 28, height: 1, background: '#31394c', margin: '2px auto' }} />

        {/* Fullscreen */}
        <button title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={handleFullscreen} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFullscreen ? '#fff' : '#93a0b5', background: isFullscreen ? '#2a3142' : 'transparent', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { if (!isFullscreen) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={(e) => { if (!isFullscreen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
          {isFullscreen ? (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Timeframe dropdown */}
      {tfOpen && (
        <div style={{ position: 'absolute', bottom: 40, left: 64, width: 200, background: '#242a38', border: '1px solid #31394c', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', padding: 6, zIndex: 100, animation: tfClosing ? 'slideOut 0.2s ease-in forwards' : 'slideIn 0.2s ease-out' }}>
          <div style={{ padding: '4px 8px', fontSize: 9, fontWeight: 700, color: '#5c677f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seconds</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 6 }}>
            {timeframes.filter(t => t.category === 'seconds').map((tf) => (
              <button key={tf.value} onClick={() => handleTfSelect(tf.value)}
                style={{ padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: timeframe === tf.value ? '#007aff' : 'transparent', color: timeframe === tf.value ? '#fff' : '#93a0b5', border: 'none' }}
                onMouseEnter={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
                {tf.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '4px 8px', fontSize: 9, fontWeight: 700, color: '#5c677f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minutes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 6 }}>
            {timeframes.filter(t => t.category === 'minutes').map((tf) => (
              <button key={tf.value} onClick={() => handleTfSelect(tf.value)}
                style={{ padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: timeframe === tf.value ? '#007aff' : 'transparent', color: timeframe === tf.value ? '#fff' : '#93a0b5', border: 'none' }}
                onMouseEnter={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
                {tf.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '4px 8px', fontSize: 9, fontWeight: 700, color: '#5c677f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
            {timeframes.filter(t => t.category === 'hours').map((tf) => (
              <button key={tf.value} onClick={() => handleTfSelect(tf.value)}
                style={{ padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: timeframe === tf.value ? '#007aff' : 'transparent', color: timeframe === tf.value ? '#fff' : '#93a0b5', border: 'none' }}
                onMouseEnter={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={(e) => { if (timeframe !== tf.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Candlestick type dropdown */}
      {ctOpen && (
        <div style={{ position: 'absolute', bottom: 40, left: 64, width: 180, background: '#242a38', border: '1px solid #31394c', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', padding: 6, zIndex: 100, animation: ctClosing ? 'slideOut 0.2s ease-in forwards' : 'slideIn 0.2s ease-out' }}>
          <div style={{ padding: '4px 8px', fontSize: 9, fontWeight: 700, color: '#5c677f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chart Type</div>
          {candleTypes.map((ct) => (
            <button key={ct.label} onClick={() => handleCtSelect(ct.label)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: candleType === ct.label ? '#007aff' : 'transparent', color: candleType === ct.label ? '#fff' : '#93a0b5', border: 'none', textAlign: 'left' }}
              onMouseEnter={(e) => { if (candleType !== ct.label) { e.currentTarget.style.background = '#2a3142'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={(e) => { if (candleType !== ct.label) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#93a0b5'; } }}>
              {/* Mini icon for each type */}
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                {ct.icon === 'candles' && <>
                  <rect x="2" y="3" width="3" height="8" rx="0.5" fill="currentColor" />
                  <line x1="3.5" y1="1" x2="3.5" y2="13" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.4" />
                  <line x1="9.5" y1="0" x2="9.5" y2="14" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="15" y="4" width="3" height="6" rx="0.5" fill="currentColor" />
                  <line x1="16.5" y1="2" x2="16.5" y2="12" stroke="currentColor" strokeWidth="0.8" />
                </>}
                {ct.icon === 'hollow' && <>
                  <rect x="2" y="3" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
                  <line x1="3.5" y1="1" x2="3.5" y2="13" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.4" />
                  <line x1="9.5" y1="0" x2="9.5" y2="14" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="15" y="4" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
                  <line x1="16.5" y1="2" x2="16.5" y2="12" stroke="currentColor" strokeWidth="0.8" />
                </>}
                {ct.icon === 'heikin' && <>
                  <rect x="2" y="4" width="4" height="6" rx="1" fill="currentColor" />
                  <line x1="4" y1="2" x2="4" y2="12" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="9" y="2" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
                  <line x1="11" y1="0" x2="11" y2="14" stroke="currentColor" strokeWidth="0.8" />
                  <rect x="15" y="5" width="4" height="4" rx="1" fill="currentColor" />
                  <line x1="17" y1="3" x2="17" y2="11" stroke="currentColor" strokeWidth="0.8" />
                </>}
                {ct.icon === 'line' && <path d="M1 10 L5 6 L9 8 L13 3 L19 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                {ct.icon === 'area' && <>
                  <path d="M1 10 L5 6 L9 8 L13 3 L19 5 L19 14 L1 14 Z" fill="currentColor" opacity="0.2" />
                  <path d="M1 10 L5 6 L9 8 L13 3 L19 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </>}
                {ct.icon === 'bar' && <>
                  <line x1="3" y1="2" x2="3" y2="12" stroke="currentColor" strokeWidth="1" />
                  <line x1="1.5" y1="4" x2="3" y2="4" stroke="currentColor" strokeWidth="1" />
                  <line x1="3" y1="10" x2="4.5" y2="10" stroke="currentColor" strokeWidth="1" />
                  <line x1="10" y1="1" x2="10" y2="13" stroke="currentColor" strokeWidth="1" />
                  <line x1="8.5" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1" />
                  <line x1="10" y1="9" x2="11.5" y2="9" stroke="currentColor" strokeWidth="1" />
                  <line x1="17" y1="3" x2="17" y2="11" stroke="currentColor" strokeWidth="1" />
                  <line x1="15.5" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1" />
                  <line x1="17" y1="9" x2="18.5" y2="9" stroke="currentColor" strokeWidth="1" />
                </>}
              </svg>
              <span>{ct.label}</span>
              {candleType === ct.label && (
                <svg style={{ marginLeft: 'auto', width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Zoom */}
      <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', background: '#242a38', border: '1px solid #31394c', borderRadius: 8, overflow: 'hidden', zIndex: 20 }}>
        <button style={{ width: 32, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93a0b5', fontSize: 12, borderRight: '1px solid #31394c', cursor: 'pointer' }}>-</button>
        <button style={{ width: 32, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93a0b5', fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>

      {/* Time axis */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, borderTop: '1px solid #31394c', background: 'rgba(26,30,40,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px 0 20px', fontSize: 10, fontFamily: 'monospace', color: '#5c677f', zIndex: 20 }}>
        {['20:40', '21:12', '21:44', '22:16', '22:48', '23:20', '23:52', '00:24', '00:56', '01:28'].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* Fullscreen trading panel */}
      {isFullscreen && onTrade && (
        <div style={{ position: 'absolute', top: 16, right: 16, width: 240, background: 'rgba(36,42,56,0.95)', border: '1px solid #31394c', borderRadius: 12, padding: 14, zIndex: 50, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{symbolName}</span>
            <span style={{ color: '#00c365', fontSize: 12, fontWeight: 600 }}>{payoutPercent}%</span>
          </div>

          {/* Time */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: '#5c677f', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <button onClick={() => onTimeChange?.(-10)} style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1e28', border: '1px solid #31394c', color: '#93a0b5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#93a0b5'; }}>-</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{timeStr.slice(0, 5)}</span>
              </div>
              <button onClick={() => onTimeChange?.(10)} style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1e28', border: '1px solid #31394c', color: '#93a0b5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#93a0b5'; }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[{ label: '00:30', val: 30 }, { label: '01:00', val: 60 }, { label: '03:00', val: 180 }, { label: '05:00', val: 300 }].map((t) => (
                <button key={t.label} onClick={() => onTimeChange?.(t.val - 60)} style={{ flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 600, borderRadius: 6, border: timeStr.slice(0, 5) === t.label ? '1px solid rgba(0,122,255,0.4)' : '1px solid transparent', background: timeStr.slice(0, 5) === t.label ? 'rgba(0,122,255,0.15)' : '#1a1e28', color: timeStr.slice(0, 5) === t.label ? '#fff' : '#5c677f', cursor: 'pointer', fontFamily: 'monospace' }}
                  onMouseEnter={(e) => { if (timeStr.slice(0, 5) !== t.label) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { if (timeStr.slice(0, 5) !== t.label) e.currentTarget.style.color = '#5c677f'; }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Investment */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: '#5c677f', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <button onClick={() => setInvestment?.(Math.max(1, investment - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1e28', border: '1px solid #31394c', color: '#93a0b5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#93a0b5'; }}>-</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>${investment}</span>
              </div>
              <button onClick={() => setInvestment?.(Math.min(100, investment + 1))} style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1e28', border: '1px solid #31394c', color: '#93a0b5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#93a0b5'; }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[1, 5, 10, 25, 50].map((amt) => (
                <button key={amt} onClick={() => setInvestment?.(amt)} style={{ flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 600, borderRadius: 6, border: investment === amt ? '1px solid rgba(0,122,255,0.4)' : '1px solid transparent', background: investment === amt ? 'rgba(0,122,255,0.15)' : '#1a1e28', color: investment === amt ? '#fff' : '#5c677f', cursor: 'pointer' }}
                  onMouseEnter={(e) => { if (investment !== amt) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { if (investment !== amt) e.currentTarget.style.color = '#5c677f'; }}>
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Payout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 10px', background: '#1a1e28', borderRadius: 8 }}>
            <span style={{ color: '#5c677f', fontSize: 10 }}>Payout</span>
            <span style={{ color: '#00c365', fontSize: 13, fontWeight: 700 }}>+{payoutAmount}$</span>
          </div>

          {/* Up/Down */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onTrade('up')}
              style={{ flex: 1, padding: '12px 0', background: '#00c365', color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,195,101,0.3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00a854'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#00c365'; }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Up
            </button>
            <button onClick={() => onTrade('down')}
              style={{ flex: 1, padding: '12px 0', background: '#ff4954', color: '#fff', fontWeight: 700, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(255,73,84,0.3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e03e48'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ff4954'; }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Down
            </button>
          </div>
        </div>
      )}
    </div>
  );
}