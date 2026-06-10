import { useState } from "react";
import { usePoll, useStored } from "../hooks";
import type { Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, upDownClass } from "../format";

interface Position {
  symbol: string;
  qty: number;
  cost: number; // average cost per share
}

export default function Port({ onPick }: { onPick?: (symbol: string) => void }) {
  const [positions, setPositions] = useStored<Position[]>("portfolio", []);
  const [sym, setSym] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");

  const path = positions.length
    ? `/quotes?symbols=${positions.map((p) => p.symbol).join(",")}`
    : null;
  const { data } = usePoll<Quote[]>(path, 30000);
  const quoteOf = (s: string) => data?.find((q) => q.symbol === s);

  const add = () => {
    const s = sym.trim().toUpperCase();
    const q = parseFloat(qty);
    const c = parseFloat(cost);
    if (!s || !Number.isFinite(q) || !Number.isFinite(c)) return;
    const rest = positions.filter((p) => p.symbol !== s);
    setPositions([...rest, { symbol: s, qty: q, cost: c }]);
    setSym("");
    setQty("");
    setCost("");
  };

  let totalValue = 0;
  let totalCost = 0;
  let totalDay = 0;
  for (const p of positions) {
    const q = quoteOf(p.symbol);
    if (q?.price != null) {
      totalValue += q.price * p.qty;
      totalDay += (q.change ?? 0) * p.qty;
    }
    totalCost += p.cost * p.qty;
  }
  const totalPnl = totalValue - totalCost;

  return (
    <div className="view">
      <div className="inline-form">
        <input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Ticker" size={8} />
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" size={6} />
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Avg cost"
          size={8}
        />
        <button onClick={add}>ADD / UPDATE</button>
      </div>

      {positions.length === 0 ? (
        <div className="dim pad">No positions — add one above (ticker, quantity, average cost).</div>
      ) : (
        <>
          <table className="grid-table clickable">
            <thead>
              <tr>
                <th className="left">TICKER</th>
                <th>QTY</th>
                <th>AVG COST</th>
                <th>LAST</th>
                <th>MKT VALUE</th>
                <th>DAY P&L</th>
                <th>TOTAL P&L</th>
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const q = quoteOf(p.symbol);
                const value = q?.price != null ? q.price * p.qty : null;
                const pnl = value != null ? value - p.cost * p.qty : null;
                const pnlPct = pnl != null && p.cost ? (pnl / (p.cost * p.qty)) * 100 : null;
                const day = q?.change != null ? q.change * p.qty : null;
                return (
                  <tr key={p.symbol}>
                    <td className="left orange" onClick={() => onPick?.(p.symbol)}>
                      {p.symbol}
                    </td>
                    <td>{fmtNum(p.qty, 0)}</td>
                    <td>{fmtNum(p.cost)}</td>
                    <td className="white">{fmtNum(q?.price)}</td>
                    <td className="white">{fmtNum(value)}</td>
                    <td className={upDownClass(day)}>{fmtChange(day)}</td>
                    <td className={upDownClass(pnl)}>{fmtChange(pnl)}</td>
                    <td className={upDownClass(pnlPct)}>{fmtPct(pnlPct)}</td>
                    <td>
                      <button
                        className="del"
                        onClick={() => setPositions(positions.filter((x) => x.symbol !== p.symbol))}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="left section-title">TOTAL</td>
                <td colSpan={3}></td>
                <td className="white">{fmtNum(totalValue)}</td>
                <td className={upDownClass(totalDay)}>{fmtChange(totalDay)}</td>
                <td className={upDownClass(totalPnl)}>{fmtChange(totalPnl)}</td>
                <td className={upDownClass(totalPnl)}>
                  {totalCost ? fmtPct((totalPnl / totalCost) * 100) : "--"}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div className="dim pad">Note: P&L mixes currencies as-is if positions trade in different currencies.</div>
        </>
      )}
    </div>
  );
}
