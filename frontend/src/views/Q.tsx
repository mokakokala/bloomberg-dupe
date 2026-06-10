import { usePoll } from "../hooks";
import type { Quote } from "../api";
import { fmtNum, fmtPct, fmtChange, fmtBig, upDownClass } from "../format";

export default function Q({ ticker }: { ticker: string }) {
  const { data: q, error, loading } = usePoll<Quote>(`/quote/${ticker}`, 15000);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !q) return <div className="dim pad">Loading {ticker}…</div>;
  if (!q || q.price == null) return <div className="error pad">⚠ No quote for {ticker}</div>;

  return (
    <div className="view q-board">
      <div className="q-symbol orange">{q.symbol}</div>
      <div className="q-price-row">
        <span className={`q-bigprice ${upDownClass(q.change)}`}>{fmtNum(q.price)}</span>
        <span className={`q-bigchange ${upDownClass(q.change)}`}>
          {fmtChange(q.change)} ({fmtPct(q.changePct)})
        </span>
      </div>
      <div className="des-grid">
        <div className="des-field"><span className="des-label">Open</span><span className="des-value">{fmtNum(q.open)}</span></div>
        <div className="des-field"><span className="des-label">Prev Close</span><span className="des-value">{fmtNum(q.prevClose)}</span></div>
        <div className="des-field"><span className="des-label">Day High</span><span className="des-value">{fmtNum(q.dayHigh)}</span></div>
        <div className="des-field"><span className="des-label">Day Low</span><span className="des-value">{fmtNum(q.dayLow)}</span></div>
        <div className="des-field"><span className="des-label">Volume</span><span className="des-value">{fmtBig(q.volume)}</span></div>
        <div className="des-field"><span className="des-label">Exchange</span><span className="des-value">{q.exchange ?? "--"} ({q.currency ?? "?"})</span></div>
      </div>
    </div>
  );
}
