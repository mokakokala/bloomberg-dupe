import { FUNCTIONS, type Func } from "../commands";

const EXAMPLES: Record<Func, string> = {
  GP: "AAPL GP",
  DES: "MC.PA DES",
  FA: "MSFT FA",
  Q: "NVDA Q",
  N: "TSLA N",
  WEI: "WEI",
  FXC: "FXC",
  CRYP: "CRYP",
  CMDTY: "CMDTY",
  TOP: "TOP",
  EQS: "EQS",
  ECO: "ECO",
  W: "W",
  PORT: "PORT",
  HELP: "HELP",
};

export default function Help() {
  return (
    <div className="view help">
      <div className="section-title pad-h">FUNCTION DIRECTORY</div>
      <table className="grid-table">
        <thead>
          <tr>
            <th className="left">MNEMONIC</th>
            <th className="left">FUNCTION</th>
            <th className="left">EXAMPLE</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(FUNCTIONS) as Func[]).map((f) => (
            <tr key={f}>
              <td className="left orange">{f}</td>
              <td className="left white">{FUNCTIONS[f].label}</td>
              <td className="left dim">{EXAMPLES[f]} &lt;GO&gt;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pad dim">
        <p>Type a command in the bar at the top, then press Enter (&lt;GO&gt;).</p>
        <p>A bare ticker (e.g. <span className="orange">RNO.PA</span>) loads it in the active panel. Click a panel to make it active. Double-click a panel header to maximize it.</p>
        <p>Tickers use Yahoo Finance notation: AAPL, MC.PA (Paris), BMW.DE, ^GSPC (index), EURUSD=X, BTC-USD, GC=F (futures).</p>
      </div>
    </div>
  );
}
