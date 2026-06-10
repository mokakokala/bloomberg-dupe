import { usePoll, useStored } from "../hooks";
import { fmtNum, fmtBig } from "../format";

interface CalRow {
  symbol: string;
  earnings: string[];
  exDividend: string | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
}

const fmtDate = (iso: string) => iso.slice(0, 10);

export default function Cal({ onPick }: { onPick?: (symbol: string) => void }) {
  const [symbols] = useStored<string[]>("watchlist", []);
  const path = symbols.length ? `/calendar?symbols=${symbols.join(",")}` : null;
  const { data, error, loading } = usePoll<CalRow[]>(path, 3600000);

  if (!symbols.length) {
    return <div className="dim pad">CAL reads your watchlist (W) — add tickers there first.</div>;
  }
  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !data) return <div className="dim pad">Loading calendar for {symbols.length} tickers…</div>;
  if (!data) return null;

  const sorted = [...data].sort((a, b) =>
    (a.earnings[0] ?? "9999").localeCompare(b.earnings[0] ?? "9999"),
  );

  return (
    <div className="view">
      <div className="section-title pad-h">UPCOMING EVENTS — watchlist tickers</div>
      <table className="grid-table clickable">
        <thead>
          <tr>
            <th className="left">TICKER</th>
            <th>NEXT EARNINGS</th>
            <th>EPS EST.</th>
            <th>REV EST.</th>
            <th>EX-DIV DATE</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.symbol} onClick={() => onPick?.(r.symbol)}>
              <td className="left orange">{r.symbol}</td>
              <td className="white">{r.earnings.length ? r.earnings.map(fmtDate).join(" / ") : "--"}</td>
              <td>{fmtNum(r.epsEstimate)}</td>
              <td>{fmtBig(r.revenueEstimate)}</td>
              <td>{r.exDividend ? fmtDate(r.exDividend) : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <div className="dim pad">No upcoming events found for watchlist tickers.</div>}
    </div>
  );
}
