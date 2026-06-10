import { useState } from "react";
import { usePoll } from "../hooks";
import type { ScreenerRow } from "../api";
import { fmtNum, fmtPct, fmtBig, upDownClass } from "../format";

const KINDS = [
  { id: "gainers", label: "GAINERS" },
  { id: "losers", label: "LOSERS" },
  { id: "actives", label: "MOST ACTIVE" },
];

export default function Eqs({ onPick }: { onPick?: (symbol: string) => void }) {
  const [kind, setKind] = useState("gainers");
  const { data, error, loading } = usePoll<ScreenerRow[]>(`/screener/${kind}`, 120000);

  return (
    <div className="view">
      <div className="tabs">
        {KINDS.map((k) => (
          <button
            key={k.id}
            className={`tab ${kind === k.id ? "active" : ""}`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      {error && <div className="error pad">⚠ {error}</div>}
      {loading && !data && <div className="dim pad">Screening…</div>}
      {data && (
        <table className="grid-table clickable">
          <thead>
            <tr>
              <th className="left">TICKER</th>
              <th className="left">NAME</th>
              <th>LAST</th>
              <th>%CHG</th>
              <th>VOLUME</th>
              <th>MKT CAP</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.symbol} onClick={() => onPick?.(r.symbol)}>
                <td className="left orange">{r.symbol}</td>
                <td className="left dim ellipsis">{r.name}</td>
                <td className="white">{fmtNum(r.price)}</td>
                <td className={upDownClass(r.changePct)}>{fmtPct(r.changePct)}</td>
                <td>{fmtBig(r.volume)}</td>
                <td>{fmtBig(r.marketCap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
