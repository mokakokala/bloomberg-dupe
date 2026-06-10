const BASE = "http://localhost:8000/api";

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return res.json();
}

export interface Quote {
  symbol: string;
  name?: string;
  price: number | null;
  prevClose?: number;
  change?: number | null;
  changePct?: number | null;
  dayHigh?: number;
  dayLow?: number;
  open?: number;
  volume?: number;
  currency?: string;
  exchange?: string;
  error?: boolean;
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  time: number | null;
}

export interface Statement {
  columns: string[];
  rows: { label: string; values: (number | null)[] }[];
}

export interface EcoRow {
  id: string;
  label: string;
  value: number;
  suffix: string;
  date: string;
  spark: number[];
}

export interface ScreenerRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap: number;
}
