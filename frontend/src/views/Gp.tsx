import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { usePoll } from "../hooks";
import type { Bar, Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, upDownClass } from "../format";

const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"];

function sma(bars: Bar[], length: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= length) sum -= bars[i - length].close;
    if (i >= length - 1) {
      out.push({ time: bars[i].time as UTCTimestamp, value: sum / length });
    }
  }
  return out;
}

export default function Gp({ ticker }: { ticker: string }) {
  const [range, setRange] = useState("1Y");
  const [candles, setCandles] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const hist = usePoll<{ bars: Bar[] }>(
    `/history/${ticker}?range=${range}`,
    range === "1D" || range === "5D" ? 60000 : 0,
  );
  const quote = usePoll<Quote>(`/quote/${ticker}`, 30000);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hist.data) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "#000000" },
        textColor: "#999999",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: {
        vertLine: { color: "#fb8b1e", labelBackgroundColor: "#fb8b1e" },
        horzLine: { color: "#fb8b1e", labelBackgroundColor: "#fb8b1e" },
      },
      timeScale: { borderColor: "#333333", timeVisible: range === "1D" || range === "5D" },
      rightPriceScale: { borderColor: "#333333" },
    });
    chartRef.current = chart;

    const bars = hist.data.bars;
    if (candles) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#00c853",
        downColor: "#ff3b30",
        borderUpColor: "#00c853",
        borderDownColor: "#ff3b30",
        wickUpColor: "#00c853",
        wickDownColor: "#ff3b30",
      });
      series.setData(bars.map((b) => ({ ...b, time: b.time as UTCTimestamp })));
    } else {
      const series = chart.addSeries(LineSeries, { color: "#fb8b1e", lineWidth: 2 });
      series.setData(bars.map((b) => ({ time: b.time as UTCTimestamp, value: b.close })));
    }

    if (bars.length > 60) {
      const ma = chart.addSeries(LineSeries, {
        color: "#2196f3",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ma.setData(sma(bars, 50));
    }

    const vol = chart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      priceFormat: { type: "volume" },
      color: "#444444",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(
      bars.map((b) => ({
        time: b.time as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? "#1b4d2e" : "#5c1f1b",
      })),
    );

    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [hist.data, candles, range]);

  const q = quote.data;
  return (
    <div className="view gp">
      <div className="gp-header">
        {q && (
          <>
            <span className="gp-price">{fmtNum(q.price)}</span>
            <span className={`gp-change ${upDownClass(q.change)}`}>
              {fmtChange(q.change)} ({fmtPct(q.changePct)})
            </span>
            <span className="dim">
              O {fmtNum(q.open)}  H {fmtNum(q.dayHigh)}  L {fmtNum(q.dayLow)}  {q.currency}
            </span>
          </>
        )}
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
          <button className="rangebtn" onClick={() => setCandles(!candles)}>
            {candles ? "LINE" : "CNDL"}
          </button>
        </span>
      </div>
      {hist.error && <div className="error">⚠ {hist.error}</div>}
      {hist.loading && !hist.data && <div className="dim pad">Loading {ticker}…</div>}
      <div ref={containerRef} className="gp-chart" />
    </div>
  );
}
