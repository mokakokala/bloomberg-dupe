import { useState } from "react";
import { usePoll } from "../hooks";
import type { Statement } from "../api";
import { fmtBig } from "../format";

type Tab = "income" | "balance" | "cashflow";
const TABS: { id: Tab; label: string }[] = [
  { id: "income", label: "INCOME STMT" },
  { id: "balance", label: "BALANCE SHEET" },
  { id: "cashflow", label: "CASH FLOW" },
];

export default function Fa({ ticker }: { ticker: string }) {
  const [tab, setTab] = useState<Tab>("income");
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const { data, error, loading } = usePoll<Record<Tab, Statement>>(
    `/financials/${ticker}?period=${period}`,
  );

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading || !data) return <div className="dim pad">Loading financials for {ticker}…</div>;

  const st = data[tab];
  return (
    <div className="view fa">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="spacer" />
        <button
          className={`tab ${period === "annual" ? "active" : ""}`}
          onClick={() => setPeriod("annual")}
        >
          ANN
        </button>
        <button
          className={`tab ${period === "quarterly" ? "active" : ""}`}
          onClick={() => setPeriod("quarterly")}
        >
          QTR
        </button>
      </div>
      {st.rows.length === 0 ? (
        <div className="dim pad">No data available.</div>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th className="left">In {ticker.toUpperCase()} reporting currency</th>
              {st.columns.map((c) => (
                <th key={c}>{c.slice(0, 7)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {st.rows.map((r) => (
              <tr key={r.label}>
                <td className="left label-cell">{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={i} className={v != null && v < 0 ? "down" : ""}>
                    {fmtBig(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
