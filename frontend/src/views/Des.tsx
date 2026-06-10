import { usePoll } from "../hooks";
import { fmtNum, fmtBig, fmtPct } from "../format";

interface Profile {
  longName?: string;
  shortName?: string;
  symbol?: string;
  exchange?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  fullTimeEmployees?: number;
  website?: string;
  city?: string;
  longBusinessSummary?: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageVolume?: number;
  sharesOutstanding?: number;
  totalRevenue?: number;
  ebitda?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  freeCashflow?: number;
  targetMeanPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  trailingEps?: number;
  enterpriseValue?: number;
  officers?: { name: string; title: string }[];
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="des-field">
      <span className="des-label">{label}</span>
      <span className="des-value">{value}</span>
    </div>
  );
}

export default function Des({ ticker }: { ticker: string }) {
  const { data: p, error, loading } = usePoll<Profile>(`/profile/${ticker}`);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading || !p) return <div className="dim pad">Loading {ticker}…</div>;

  return (
    <div className="view des">
      <div className="des-title">
        <span className="orange">{p.longName ?? p.shortName}</span>
        <span className="dim"> — {p.exchange} · {p.currency} · {p.country}</span>
      </div>
      <div className="des-sub">
        {p.sector} | {p.industry}
        {p.fullTimeEmployees ? ` | ${p.fullTimeEmployees.toLocaleString()} employees` : ""}
        {p.website ? ` | ${p.website.replace(/^https?:\/\/(www\.)?/, "")}` : ""}
      </div>
      {p.longBusinessSummary && <p className="des-summary">{p.longBusinessSummary}</p>}

      <div className="des-grid">
        <Field label="Mkt Cap" value={fmtBig(p.marketCap)} />
        <Field label="EV" value={fmtBig(p.enterpriseValue)} />
        <Field label="Revenue" value={fmtBig(p.totalRevenue)} />
        <Field label="EBITDA" value={fmtBig(p.ebitda)} />
        <Field label="P/E (ttm)" value={fmtNum(p.trailingPE)} />
        <Field label="P/E (fwd)" value={fmtNum(p.forwardPE)} />
        <Field label="P/B" value={fmtNum(p.priceToBook)} />
        <Field label="EPS (ttm)" value={fmtNum(p.trailingEps)} />
        <Field label="Div Yield" value={p.dividendYield != null ? fmtPct(p.dividendYield) : "--"} />
        <Field label="Beta" value={fmtNum(p.beta)} />
        <Field label="52W High" value={fmtNum(p.fiftyTwoWeekHigh)} />
        <Field label="52W Low" value={fmtNum(p.fiftyTwoWeekLow)} />
        <Field label="Avg Volume" value={fmtBig(p.averageVolume)} />
        <Field label="Shares Out" value={fmtBig(p.sharesOutstanding)} />
        <Field label="Net Margin" value={p.profitMargins != null ? fmtPct(p.profitMargins * 100) : "--"} />
        <Field label="ROE" value={p.returnOnEquity != null ? fmtPct(p.returnOnEquity * 100) : "--"} />
        <Field label="Debt/Equity" value={fmtNum(p.debtToEquity)} />
        <Field label="FCF" value={fmtBig(p.freeCashflow)} />
        <Field
          label="Analyst Target"
          value={`${fmtNum(p.targetMeanPrice)}${p.recommendationKey ? ` (${p.recommendationKey.toUpperCase()}, ${p.numberOfAnalystOpinions ?? "?"} est.)` : ""}`}
        />
      </div>

      {p.officers && p.officers.length > 0 && (
        <div className="des-officers">
          <div className="section-title">MANAGEMENT</div>
          {p.officers.map((o, i) => (
            <div key={i} className="des-officer">
              <span className="white">{o.name}</span>
              <span className="dim"> — {o.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
