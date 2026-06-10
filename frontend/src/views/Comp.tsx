import { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";
import { get, type Bar } from "../api";
import { fmtPct, upDownClass } from "../format";

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"];
const COLORS = ["#fb8b1e", "#2196f3", "#00c853", "#e91e63", "#ffeb3b", "#00bcd4", "#9c27b0"];

interface Series {
  symbol: string;
  bars: Bar[];
}

export default function Comp({ tickers }: { tickers: string[] }) {
  const [range, setRange] = useState("1Y");
  const [series, setSeries] = useState<Series[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setSeries(null);
    setError(null);
    Promise.all(
      tickers.map((t) =>
        get<{ bars: Bar[] }>(`/history/${t}?range=${range}`)
          .then((d) => ({ symbol: t, bars: d.bars }))
          .catch(() => ({ symbol: t, bars: [] as Bar[] })),
      ),
    ).then((all) => {
      if (!alive) return;
      const ok = all.filter((s) => s.bars.length > 0);
      if (ok.length === 0) setError("no data for these tickers");
      else setSeries(ok);
    });
    return () => {
      alive = false;
    };
  }, [tickers.join(","), range]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !series) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "#000000" },
        textColor: "#999999",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: "#1a1a1a" }, horzLines: { color: "#1a1a1a" } },
      crosshair: {
        vertLine: { color: "#fb8b1e", labelBackgroundColor: "#fb8b1e" },
        horzLine: { color: "#fb8b1e", labelBackgroundColor: "#fb8b1e" },
      },
      timeScale: { borderColor: "#333333" },
      rightPriceScale: {
        borderColor: "#333333",
        mode: 0,
      },
      localization: { priceFormatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` },
    });

    series.forEach((s, i) => {
      const base = s.bars[0].close;
      const line = chart.addSeries(LineSeries, {
        color: COLORS[i % COLORS.length],
        lineWidth: 2,
        priceLineVisible: false,
        title: s.symbol,
      });
      line.setData(
        s.bars.map((b) => ({
          time: b.time as UTCTimestamp,
          value: (b.close / base - 1) * 100,
        })),
      );
    });

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [series]);

  const perf = (s: Series) => (s.bars[s.bars.length - 1].close / s.bars[0].close - 1) * 100;

  return (
    <div className="view gp">
      <div className="gp-header">
        {series?.map((s, i) => (
          <span key={s.symbol}>
            <span style={{ color: COLORS[i % COLORS.length] }}>■ {s.symbol}</span>{" "}
            <span className={upDownClass(perf(s))}>{fmtPct(perf(s))}</span>
          </span>
        ))}
        <span className="gp-controls">
          {RANGES.map((r) => (
            <button
              key={r}
              className={`rangebtn ${r === range ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </span>
      </div>
      {error && <div className="error pad">⚠ {error}</div>}
      {!series && !error && <div className="dim pad">Loading {tickers.join(", ")}…</div>}
      <div ref={containerRef} className="gp-chart" />
    </div>
  );
}
