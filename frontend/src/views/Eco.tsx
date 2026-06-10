import { usePoll } from "../hooks";
import type { EcoRow } from "../api";
import { fmtNum } from "../format";

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 24;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} className="spark">
      <polyline points={pts} fill="none" stroke={rising ? "#00c853" : "#ff3b30"} strokeWidth="1.2" />
    </svg>
  );
}

export default function Eco() {
  const { data, error, loading } = usePoll<EcoRow[]>("/eco", 3600000);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !data) return <div className="dim pad">Loading FRED data…</div>;
  if (!data) return null;

  return (
    <div className="view">
      <div className="section-title pad-h">US ECONOMIC INDICATORS — source: FRED (St. Louis Fed)</div>
      <table className="grid-table">
        <thead>
          <tr>
            <th className="left">INDICATOR</th>
            <th>VALUE</th>
            <th>AS OF</th>
            <th className="left">TREND (5Y)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="left orange">{r.label}</td>
              <td className="white">
                {fmtNum(r.value)}
                <span className="dim">{r.suffix}</span>
              </td>
              <td className="dim">{r.date}</td>
              <td className="left">
                <Spark values={r.spark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
