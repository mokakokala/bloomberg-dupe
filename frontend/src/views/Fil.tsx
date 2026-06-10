import { usePoll } from "../hooks";

interface Filing {
  form: string;
  date: string;
  description: string;
  url: string;
}

const MAJOR = new Set(["10-K", "10-Q", "8-K", "DEF 14A", "S-1", "20-F", "6-K"]);

export default function Fil({ ticker }: { ticker: string }) {
  const { data, error, loading } = usePoll<Filing[]>(`/filings/${ticker}`);

  if (error) return <div className="error pad">⚠ {error}</div>;
  if (loading && !data) return <div className="dim pad">Loading EDGAR filings for {ticker}…</div>;
  if (!data || data.length === 0) return <div className="dim pad">No filings found.</div>;

  return (
    <div className="view">
      <div className="section-title pad-h">SEC FILINGS — EDGAR</div>
      <table className="grid-table">
        <thead>
          <tr>
            <th className="left">DATE</th>
            <th className="left">FORM</th>
            <th className="left">DOCUMENT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f, i) => (
            <tr key={i}>
              <td className="left dim">{f.date}</td>
              <td className={`left ${MAJOR.has(f.form) ? "orange" : "dim"}`}>{f.form}</td>
              <td className="left">
                <a className="filing-link" href={f.url} target="_blank" rel="noreferrer">
                  {f.description}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
