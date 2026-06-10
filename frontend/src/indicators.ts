import type { UTCTimestamp } from "lightweight-charts";
import type { Bar } from "./api";

export interface Point {
  time: UTCTimestamp;
  value: number;
}

export function sma(bars: Bar[], length: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= length) sum -= bars[i - length].close;
    if (i >= length - 1) out.push({ time: bars[i].time as UTCTimestamp, value: sum / length });
  }
  return out;
}

export function bollinger(bars: Bar[], length = 20, mult = 2) {
  const mid: Point[] = [];
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let i = length - 1; i < bars.length; i++) {
    const window = bars.slice(i - length + 1, i + 1).map((b) => b.close);
    const mean = window.reduce((a, b) => a + b, 0) / length;
    const sd = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / length);
    const t = bars[i].time as UTCTimestamp;
    mid.push({ time: t, value: mean });
    upper.push({ time: t, value: mean + mult * sd });
    lower.push({ time: t, value: mean - mult * sd });
  }
  return { mid, upper, lower };
}

export function rsi(bars: Bar[], length = 14): Point[] {
  const out: Point[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    if (i <= length) {
      avgGain += gain / length;
      avgLoss += loss / length;
      if (i < length) continue;
    } else {
      avgGain = (avgGain * (length - 1) + gain) / length;
      avgLoss = (avgLoss * (length - 1) + loss) / length;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push({
      time: bars[i].time as UTCTimestamp,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs),
    });
  }
  return out;
}

function emaSeries(values: number[], length: number): number[] {
  const k = 2 / (length + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function macd(bars: Bar[], fast = 12, slow = 26, signalLen = 9) {
  const closes = bars.map((b) => b.close);
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const macdVals = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalVals = emaSeries(macdVals, signalLen);

  const line: Point[] = [];
  const signal: Point[] = [];
  const histogram: { time: UTCTimestamp; value: number; color: string }[] = [];
  for (let i = slow - 1; i < bars.length; i++) {
    const t = bars[i].time as UTCTimestamp;
    const h = macdVals[i] - signalVals[i];
    line.push({ time: t, value: macdVals[i] });
    signal.push({ time: t, value: signalVals[i] });
    histogram.push({ time: t, value: h, color: h >= 0 ? "#1b4d2e" : "#5c1f1b" });
  }
  return { line, signal, histogram };
}
