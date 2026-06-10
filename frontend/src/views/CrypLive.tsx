import { useEffect, useState } from "react";
import { usePoll } from "../hooks";
import type { Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, upDownClass } from "../format";

// Yahoo symbol → Binance stream symbol
const BINANCE: Record<string, string> = {
  "BTC-USD": "btcusdt",
  "ETH-USD": "ethusdt",
  "SOL-USD": "solusdt",
  "BNB-USD": "bnbusdt",
  "XRP-USD": "xrpusdt",
  "ADA-USD": "adausdt",
  "DOGE-USD": "dogeusdt",
  "AVAX-USD": "avaxusdt",
  "DOT1-USD": "dotusdt",
};

interface LiveTick {
  price: number;
  changePct: number;
}

export default function CrypLive({ onPick }: { onPick?: (symbol: string) => void }) {
  // REST snapshot for names/ordering; websocket overrides prices in real time.
  const { data, error } = usePoll<Quote[]>("/crypto", 120000);
  const [live, setLive] = useState<Record<string, LiveTick>>({});
  const [wsOk, setWsOk] = useState(false);

  useEffect(() => {
    const streams = Object.values(BINANCE).map((s) => `${s}@miniTicker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    const reverse = Object.fromEntries(Object.entries(BINANCE).map(([y, b]) => [b, y]));

    ws.onopen = () => setWsOk(true);
    ws.onclose = () => setWsOk(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const d = msg.data;
        const yahoo = reverse[(d.s as string).toLowerCase()];
        if (!yahoo) return;
        const close = parseFloat(d.c);
        const open = parseFloat(d.o);
        setLive((prev) => ({
          ...prev,
          [yahoo]: { price: close, changePct: ((close - open) / open) * 100 },
        }));
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => ws.close();
  }, []);

  if (error && !data) return <div className="error pad">⚠ {error}</div>;
  if (!data) return <div className="dim pad">Loading…</div>;

  return (
    <div className="view">
      <div className="pad-h">
        <span className={`live-dot ${wsOk ? "on" : ""}`} />
        <span className={wsOk ? "up" : "dim"}>
          {wsOk ? "LIVE — Binance websocket" : "delayed — websocket connecting…"}
        </span>
      </div>
      <table className="grid-table clickable">
        <thead>
          <tr>
            <th className="left">NAME</th>
            <th>LAST</th>
            <th>CHG</th>
            <th>%CHG (24H)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((q) => {
            const l = live[q.symbol];
            const price = l?.price ?? q.price;
            const pct = l?.changePct ?? q.changePct;
            const chg = price != null && pct != null ? (price * pct) / (100 + pct) : q.change;
            return (
              <tr key={q.symbol} onClick={() => onPick?.(q.symbol)}>
                <td className="left orange">{q.name ?? q.symbol}</td>
                <td className="white">{fmtNum(price, price != null && price < 10 ? 4 : 2)}</td>
                <td className={upDownClass(chg)}>{fmtChange(chg)}</td>
                <td className={upDownClass(pct)}>{fmtPct(pct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
