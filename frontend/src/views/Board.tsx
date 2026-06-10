import { usePoll } from "../hooks";
import type { Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, upDownClass } from "../format";

/** Generic quote board used by WEI / FXC / CRYP / CMDTY. */
export default function Board({
  endpoint,
  digits = 2,
  onPick,
}: {
  endpoint: string;
  digits?: number;
  onPick?: (symbol: string) => void;
}) {
  const { data, error, loading } = usePoll<Quote[]>(`/${endpoint}`, 45000);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !data) return <div className="dim pad">Loading…</div>;
  if (!data) return null;

  return (
    <div className="view">
      <table className="grid-table clickable">
        <thead>
          <tr>
            <th className="left">NAME</th>
            <th>LAST</th>
            <th>CHG</th>
            <th>%CHG</th>
          </tr>
        </thead>
        <tbody>
          {data.map((q) => (
            <tr key={q.symbol} onClick={() => onPick?.(q.symbol)}>
              <td className="left">
                <span className="orange">{q.name ?? q.symbol}</span>
              </td>
              <td className="white">{fmtNum(q.price, digits)}</td>
              <td className={upDownClass(q.change)}>{fmtChange(q.change, digits)}</td>
              <td className={upDownClass(q.changePct)}>{fmtPct(q.changePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
