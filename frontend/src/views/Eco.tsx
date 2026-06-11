import { usePoll, useStored } from "../hooks";
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

const REGIONS = {
  eu: { label: "EUROPE", path: "/eco/eu", title: "EURO AREA INDICATORS — source: ECB Data Portal" },
  us: { label: "US", path: "/eco", title: "US ECONOMIC INDICATORS — source: FRED (St. Louis Fed)" },
} as const;

type Region = keyof typeof REGIONS;

export default function Eco() {
  const [region, setRegion] = useStored<Region>("eco-region", "eu");
  const r = REGIONS[region] ?? REGIONS.eu;
  const { data, error, loading } = usePoll<EcoRow[]>(r.path, 3600000);

  return (
    <div className="view">
      <div className="tabs">
        {(Object.keys(REGIONS) as Region[]).map((k) => (
          <button
            key={k}
            className={`tab ${region === k ? "active" : ""}`}
            onClick={() => setRegion(k)}
          >
            {REGIONS[k].label}
          </button>
        ))}
      </div>
      <div className="section-title pad-h">{r.title}</div>
      {error && <div className="error pad">⚠ {error}</div>}
      {loading && !data && <div className="dim pad">Loading…</div>}
      {data && (
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
            {data.map((row) => (
              <tr key={row.id}>
                <td className="left orange">{row.label}</td>
                <td className="white">
                  {fmtNum(row.value)}
                  <span className="dim">{row.suffix}</span>
                </td>
                <td className="dim">{row.date}</td>
                <td className="left">
                  <Spark values={row.spark} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
