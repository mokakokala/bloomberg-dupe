/**
 * Bloomberg-style command parsing.
 * Accepted forms:  "AAPL GP", "GP AAPL", "AAPL US Equity GP", "WEI", "AAPL"
 */

export type Func =
  | "GP" | "DES" | "FA" | "Q"
  | "WEI" | "FXC" | "CRYP" | "CMDTY"
  | "TOP" | "N" | "EQS" | "ECO"
  | "W" | "PORT" | "HELP";

export interface PanelState {
  func: Func;
  ticker?: string;
}

export const FUNCTIONS: Record<Func, { label: string; needsTicker: boolean }> = {
  GP: { label: "Price chart", needsTicker: true },
  DES: { label: "Security description", needsTicker: true },
  FA: { label: "Financial analysis", needsTicker: true },
  Q: { label: "Quote board", needsTicker: true },
  N: { label: "Company news", needsTicker: true },
  WEI: { label: "World equity indices", needsTicker: false },
  FXC: { label: "FX rate matrix", needsTicker: false },
  CRYP: { label: "Cryptocurrencies", needsTicker: false },
  CMDTY: { label: "Commodities", needsTicker: false },
  TOP: { label: "Top news", needsTicker: false },
  EQS: { label: "Equity screener", needsTicker: false },
  ECO: { label: "Economic data (FRED)", needsTicker: false },
  W: { label: "Watchlist", needsTicker: false },
  PORT: { label: "Portfolio", needsTicker: false },
  HELP: { label: "Command list", needsTicker: false },
};

const ALIASES: Record<string, Func> = {
  NEWS: "N", CHART: "GP", G: "GP", FX: "FXC", CRYPTO: "CRYP",
  COMM: "CMDTY", SCREEN: "EQS", WATCH: "W", PF: "PORT", "?": "HELP",
};

// Bloomberg market-sector words users may type out of habit; ignore them.
const NOISE = new Set(["US", "EQUITY", "INDEX", "CURNCY", "COMDTY", "GOVT", "GO"]);

export function parseCommand(input: string, current?: PanelState): PanelState | { error: string } {
  const tokens = input
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t));
  if (tokens.length === 0) return { error: "empty command" };

  const isFunc = (t: string): Func | null =>
    t in FUNCTIONS ? (t as Func) : (ALIASES[t] ?? null);

  let func: Func | null = null;
  const rest: string[] = [];
  for (const t of tokens) {
    const f = isFunc(t);
    if (f && !func) func = f;
    else rest.push(t);
  }

  const ticker = rest[0];

  if (!func) {
    // Bare ticker: keep current function if it takes a ticker, else show quote board.
    if (!ticker) return { error: "unknown command" };
    const keep = current && FUNCTIONS[current.func].needsTicker ? current.func : "Q";
    return { func: keep, ticker };
  }

  if (FUNCTIONS[func].needsTicker) {
    const t = ticker ?? current?.ticker;
    if (!t) return { error: `${func} requires a ticker — e.g. "AAPL ${func}"` };
    return { func, ticker: t };
  }

  return { func };
}
