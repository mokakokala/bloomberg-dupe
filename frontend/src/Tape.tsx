import { usePoll } from "./hooks";
import type { Quote } from "./api";
import { fmtNum, fmtPct, upDownClass } from "./format";

export default function Tape() {
  const { data } = usePoll<Quote[]>("/indices", 60000);
  if (!data) return <div className="tape" />;

  const items = data.filter((q) => q.price != null);
  // Duplicate the list so the CSS loop is seamless.
  const loop = [...items, ...items];
  return (
    <div className="tape">
      <div className="tape-inner">
        {loop.map((q, i) => (
          <span key={i} className="tape-item">
            <span className="orange">{q.name}</span>{" "}
            <span className="white">{fmtNum(q.price)}</span>{" "}
            <span className={upDownClass(q.changePct)}>{fmtPct(q.changePct)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
