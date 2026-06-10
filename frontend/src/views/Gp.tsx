import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { usePoll } from "../hooks";
import type { Bar, Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, upDownClass } from "../format";
import { sma, bollinger, rsi, macd } from "../indicators";

const RANGES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"];

export default function Gp({ ticker, initialRange = "1Y" }: { ticker: string; initialRange?: string }) {
  const [range, setRange] = useState(initialRange);
  const [candles, setCandles] = useState(true);
  const [showBoll, setShowBoll] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showMacd, setShowMacd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        panes: { separatorColor: "#2a2a2a", enableResize: true },
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

    const overlayLine = (color: string, width: 1 | 2 = 1) =>
      chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

    if (bars.length > 60 && !showBoll) {
      overlayLine("#2196f3").setData(sma(bars, 50));
    }

    if (showBoll && bars.length > 20) {
      const bb = bollinger(bars);
      overlayLine("#9c27b0").setData(bb.upper);
      overlayLine("#9c27b0").setData(bb.lower);
      overlayLine("#7e57c2").setData(bb.mid);
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

    let pane = 1;
    if (showRsi && bars.length > 15) {
      const series = chart.addSeries(
        LineSeries,
        { color: "#ffb000", lineWidth: 1, priceLineVisible: false },
        pane,
      );
      series.setData(rsi(bars));
      series.createPriceLine({ price: 70, color: "#5c1f1b", lineStyle: 2, title: "70" });
      series.createPriceLine({ price: 30, color: "#1b4d2e", lineStyle: 2, title: "30" });
      chart.panes()[pane]?.setHeight(90);
      pane++;
    }

    if (showMacd && bars.length > 35) {
      const m = macd(bars);
      const histSeries = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false, lastValueVisible: false },
        pane,
      );
      histSeries.setData(m.histogram);
      const lineSeries = chart.addSeries(
        LineSeries,
        { color: "#2196f3", lineWidth: 1, priceLineVisible: false },
        pane,
      );
      lineSeries.setData(m.line);
      const signalSeries = chart.addSeries(
        LineSeries,
        { color: "#fb8b1e", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
        pane,
      );
      signalSeries.setData(m.signal);
      chart.panes()[pane]?.setHeight(90);
    }

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [hist.data, candles, range, showBoll, showRsi, showMacd]);

  const q = quote.data;
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <button className={`rangebtn ${on ? "active" : ""}`} onClick={() => set(!on)}>
      {label}
    </button>
  );

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
          <span className="gp-sep" />
          <button className="rangebtn" onClick={() => setCandles(!candles)}>
            {candles ? "LINE" : "CNDL"}
          </button>
          {toggle("BOLL", showBoll, setShowBoll)}
          {toggle("RSI", showRsi, setShowRsi)}
          {toggle("MACD", showMacd, setShowMacd)}
        </span>
      </div>
      {hist.error && <div className="error">⚠ {hist.error}</div>}
      {hist.loading && !hist.data && <div className="dim pad">Loading {ticker}…</div>}
      <div ref={containerRef} className="gp-chart" />
    </div>
  );
}
