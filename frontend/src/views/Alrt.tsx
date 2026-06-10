import { useState } from "react";
import { usePoll } from "../hooks";
import type { Quote } from "../api";
import type { Alert } from "../alerts";
import { requestNotifyPermission } from "../alerts";
import { fmtNum, fmtTime } from "../format";

export default function Alrt({
  alerts,
  setAlerts,
}: {
  alerts: Alert[];
  setAlerts: (a: Alert[]) => void;
}) {
  const [sym, setSym] = useState("");
  const [op, setOp] = useState<">" | "<">(">");
  const [price, setPrice] = useState("");

  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const { data } = usePoll<Quote[]>(
    symbols.length ? `/quotes?symbols=${symbols.join(",")}` : null,
    30000,
  );
  const lastOf = (s: string) => data?.find((q) => q.symbol === s)?.price;

  const add = () => {
    const s = sym.trim().toUpperCase();
    const p = parseFloat(price);
    if (!s || !Number.isFinite(p)) return;
    requestNotifyPermission();
    setAlerts([
      ...alerts,
      { id: `${Date.now()}`, symbol: s, op, price: p, triggered: false },
    ]);
    setSym("");
    setPrice("");
  };

  const notifyState =
    "Notification" in window ? Notification.permission : "unsupported";

  return (
    <div className="view">
      <div className="inline-form">
        <input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Ticker" size={8} />
        <button onClick={() => setOp(op === ">" ? "<" : ">")}>{op === ">" ? "ABOVE" : "BELOW"}</button>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Price"
          size={8}
        />
        <button onClick={add}>SET ALERT</button>
        {notifyState !== "granted" && (
          <span className="dim">
            {notifyState === "denied"
              ? "browser notifications blocked — alerts shown in-app only"
              : "notifications permission will be requested on first alert"}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="dim pad">No alerts — set one above. Alerts are checked every 30s while the terminal is open.</div>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th className="left">TICKER</th>
              <th>CONDITION</th>
              <th>LAST</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className={a.triggered ? "alert-hit" : ""}>
                <td className="left orange">{a.symbol}</td>
                <td className="white">
                  {a.op} {fmtNum(a.price)}
                </td>
                <td>{fmtNum(lastOf(a.symbol))}</td>
                <td className={a.triggered ? "down" : "dim"}>
                  {a.triggered
                    ? `TRIGGERED ${a.triggeredAt ? fmtTime(Math.floor(a.triggeredAt / 1000)) : ""}`
                    : "armed"}
                </td>
                <td>
                  <button className="del" onClick={() => setAlerts(alerts.filter((x) => x.id !== a.id))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
