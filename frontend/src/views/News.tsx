import { usePoll } from "../hooks";
import type { NewsItem } from "../api";
import { fmtTime } from "../format";

export default function News({ ticker }: { ticker?: string }) {
  const path = ticker ? `/news/${ticker}` : "/news";
  const { data, error, loading } = usePoll<NewsItem[]>(path, 300000);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !data) return <div className="dim pad">Loading news…</div>;
  if (!data || data.length === 0) return <div className="dim pad">No news found.</div>;

  return (
    <div className="view news">
      {data.map((n, i) => (
        <a key={i} className="news-row" href={n.link} target="_blank" rel="noreferrer">
          <span className="news-num">{i + 1})</span>
          <span className="news-title">{n.title}</span>
          <span className="news-meta">
            {n.source} {fmtTime(n.time)}
          </span>
        </a>
      ))}
    </div>
  );
}
