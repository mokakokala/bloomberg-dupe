import { useEffect, useRef, useState } from "react";
import { parseCommand, type PanelState } from "./commands";
import { useStored } from "./hooks";
import { get, type Quote } from "./api";
import { notifyAlert, type Alert } from "./alerts";
import Panel from "./Panel";
import Tape from "./Tape";
import Gp from "./views/Gp";
import Comp from "./views/Comp";
import Des from "./views/Des";
import Fa from "./views/Fa";
import Q from "./views/Q";
import Board from "./views/Board";
import News from "./views/News";
import Eqs from "./views/Eqs";
import Eco from "./views/Eco";
import Cal from "./views/Cal";
import Fil from "./views/Fil";
import Watch from "./views/Watch";
import Port from "./views/Port";
import Alrt from "./views/Alrt";
import CrypLive from "./views/CrypLive";
import Help from "./views/Help";

const DEFAULT_PANELS: PanelState[] = [
  { func: "GP", ticker: "AAPL" },
  { func: "WEI" },
  { func: "TOP" },
  { func: "W" },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (tz: string) =>
    now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  return (
    <span className="clock">
      NY {fmt("America/New_York")} · LDN {fmt("Europe/London")} · PAR{" "}
      {fmt("Europe/Paris")} · TYO {fmt("Asia/Tokyo")}
    </span>
  );
}

function View({
  state,
  onPick,
  alerts,
  setAlerts,
}: {
  state: PanelState;
  onPick: (s: string) => void;
  alerts: Alert[];
  setAlerts: (a: Alert[]) => void;
}) {
  const t = state.ticker ?? "";
  switch (state.func) {
    case "GP": return <Gp key={t} ticker={t} />;
    case "GIP": return <Gp key={`i${t}`} ticker={t} initialRange="1D" />;
    case "COMP": return <Comp key={(state.tickers ?? []).join()} tickers={state.tickers ?? [t]} />;
    case "DES": return <Des key={t} ticker={t} />;
    case "FA": return <Fa key={t} ticker={t} />;
    case "Q": return <Q key={t} ticker={t} />;
    case "N": return <News key={t} ticker={t} />;
    case "FIL": return <Fil key={t} ticker={t} />;
    case "TOP": return <News />;
    case "WEI": return <Board endpoint="indices" onPick={onPick} />;
    case "FXC": return <Board endpoint="fx" digits={4} onPick={onPick} />;
    case "CRYP": return <CrypLive onPick={onPick} />;
    case "CMDTY": return <Board endpoint="commodities" onPick={onPick} />;
    case "EQS": return <Eqs onPick={onPick} />;
    case "ECO": return <Eco />;
    case "CAL": return <Cal onPick={onPick} />;
    case "W": return <Watch onPick={onPick} />;
    case "PORT": return <Port onPick={onPick} />;
    case "ALRT": return <Alrt alerts={alerts} setAlerts={setAlerts} />;
    case "HELP": return <Help />;
  }
}

export default function App() {
  const [panels, setPanels] = useStored<PanelState[]>("panels", DEFAULT_PANELS);
  const [active, setActive] = useState(0);
  const [maximized, setMaximized] = useState<number | null>(null);
  const [cmd, setCmd] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [alerts, setAlerts] = useStored<Alert[]>("alerts", []);
  const [alertFlash, setAlertFlash] = useState<string | null>(null);
  // Per-panel navigation history (in-memory; cleared on reload).
  const [histories, setHistories] = useState<PanelState[][]>([[], [], [], []]);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  // Any plain typing outside an input focuses the command line, Bloomberg-style.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Alert engine — checks armed alerts every 30s regardless of open panels.
  useEffect(() => {
    const check = async () => {
      const armed = alertsRef.current.filter((a) => !a.triggered);
      if (armed.length === 0) return;
      const symbols = [...new Set(armed.map((a) => a.symbol))];
      let quotes: Quote[];
      try {
        quotes = await get<Quote[]>(`/quotes?symbols=${symbols.join(",")}`);
      } catch {
        return;
      }
      const hits: Alert[] = [];
      const next = alertsRef.current.map((a) => {
        if (a.triggered) return a;
        const last = quotes.find((q) => q.symbol === a.symbol)?.price;
        if (last == null) return a;
        const hit = a.op === ">" ? last > a.price : last < a.price;
        if (!hit) return a;
        const fired = { ...a, triggered: true, triggeredAt: Date.now() };
        hits.push(fired);
        notifyAlert(fired, last);
        return fired;
      });
      if (hits.length) {
        setAlerts(next);
        setAlertFlash(hits.map((h) => `${h.symbol} ${h.op} ${h.price}`).join(" · "));
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [setAlerts]);

  const applyToPanel = (idx: number, state: PanelState) => {
    setHistories((prev) =>
      prev.map((h, i) => (i === idx ? [...h, panels[idx]].slice(-20) : h)),
    );
    setPanels((prev) => prev.map((p, i) => (i === idx ? state : p)));
  };

  const goBack = (idx: number) => {
    const h = histories[idx];
    if (h.length === 0) return;
    const previous = h[h.length - 1];
    setHistories((prev) => prev.map((x, i) => (i === idx ? x.slice(0, -1) : x)));
    setPanels((prev) => prev.map((p, i) => (i === idx ? previous : p)));
  };

  const run = () => {
    const trimmed = cmd.trim().toUpperCase();
    if (!trimmed) return;
    if (trimmed === "BACK" || trimmed === "MENU") {
      goBack(active);
      setCmd("");
      setMessage(null);
      return;
    }
    const result = parseCommand(cmd, panels[active]);
    if ("error" in result) {
      setMessage(result.error);
    } else {
      applyToPanel(active, result);
      setMessage(null);
    }
    setCmd("");
  };

  const pickInActive = (idx: number) => (symbol: string) => {
    setActive(idx);
    applyToPanel(idx, { func: "GP", ticker: symbol });
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">TERMINAL</span>
        <div className="cmdline">
          <span className="prompt">&gt;</span>
          <input
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
              if (e.key === "Escape") setCmd("");
            }}
            placeholder='Enter command — e.g. "AAPL GP", "COMP AAPL MSFT", "HELP"'
            spellCheck={false}
            autoFocus
          />
          <button className="go" onClick={run}>
            &lt;GO&gt;
          </button>
        </div>
        <Clock />
      </header>

      {message && <div className="cmd-message">⚠ {message} — type HELP for the function list</div>}
      {alertFlash && (
        <div className="cmd-message alert-banner" onClick={() => setAlertFlash(null)}>
          🔔 PRICE ALERT TRIGGERED: {alertFlash} — click to dismiss, see ALRT
        </div>
      )}

      <Tape />

      <main className={`grid ${maximized !== null ? "maxed" : ""}`}>
        {panels.map((p, i) =>
          maximized !== null && maximized !== i ? null : (
            <Panel
              key={i}
              index={i}
              state={p}
              active={active === i}
              maximized={maximized === i}
              canGoBack={histories[i].length > 0}
              onBack={() => goBack(i)}
              onFocus={() => setActive(i)}
              onToggleMax={() => setMaximized(maximized === i ? null : i)}
            >
              <View state={p} onPick={pickInActive(i)} alerts={alerts} setAlerts={setAlerts} />
            </Panel>
          ),
        )}
      </main>

      <footer className="statusbar">
        <span>Panel {active + 1} active</span>
        <span className="dim">
          Data: Yahoo Finance (~15 min delay) · FRED · SEC EDGAR · RSS · Binance — free sources, not for trading
        </span>
      </footer>
    </div>
  );
}
