import { useState } from "react";
import { usePoll, useStored } from "../hooks";
import type { Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, fmtBig, upDownClass } from "../format";

export default function Watch({ onPick }: { onPick?: (symbol: string) => void }) {
  const [symbols, setSymbols] = useStored<string[]>("watchlist", ["AAPL", "MSFT", "NVDA", "MC.PA", "^GSPC"]);
  const [input, setInput] = useState("");
  const path = symbols.length ? `/quotes?symbols=${symbols.join(",")}` : null;
  const { data, error } = usePoll<Quote[]>(path, 30000);

  const add = () => {
    const s = input.trim().toUpperCase();
    if (s && !symbols.includes(s)) setSymbols([...symbols, s]);
    setInput("");
  };

  return (
    <div className="view">
      <div className="inline-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add ticker…"
        />
        <button onClick={add}>ADD</button>
      </div>
      {error && <div className="error pad">⚠ {error}</div>}
      {symbols.length === 0 && <div className="dim pad">Watchlist empty — add a ticker above.</div>}
      {data && (
        <table className="grid-table clickable">
          <thead>
            <tr>
              <th className="left">TICKER</th>
              <th>LAST</th>
              <th>CHG</th>
              <th>%CHG</th>
              <th>VOLUME</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((q) => (
              <tr key={q.symbol}>
                <td className="left orange" onClick={() => onPick?.(q.symbol)}>
                  {q.symbol}
                </td>
                <td className="white">{fmtNum(q.price)}</td>
                <td className={upDownClass(q.change)}>{fmtChange(q.change)}</td>
                <td className={upDownClass(q.changePct)}>{fmtPct(q.changePct)}</td>
                <td>{fmtBig(q.volume)}</td>
                <td>
                  <button
                    className="del"
                    onClick={() => setSymbols(symbols.filter((s) => s !== q.symbol))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
