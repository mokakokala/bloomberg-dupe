import type { ReactNode } from "react";
import { FUNCTIONS, type PanelState } from "./commands";

export default function Panel({
  index,
  state,
  active,
  maximized,
  canGoBack,
  onBack,
  onFocus,
  onToggleMax,
  children,
}: {
  index: number;
  state: PanelState;
  active: boolean;
  maximized: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onFocus: () => void;
  onToggleMax: () => void;
  children: ReactNode;
}) {
  const tickerPart = state.tickers?.length
    ? state.tickers.join(" ") + " "
    : state.ticker
      ? state.ticker + " "
      : "";
  const title = `${tickerPart}${state.func} — ${FUNCTIONS[state.func].label}`;
  return (
    <div className={`panel ${active ? "active" : ""}`} onMouseDown={onFocus}>
      <div className="panel-header" onDoubleClick={onToggleMax} title="Double-click to maximize">
        <span className="panel-index">{index + 1}</span>
        {canGoBack && (
          <button
            className="panel-back"
            title="Back (or type BACK)"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
          >
            ←
          </button>
        )}
        <span className="panel-title">{title}</span>
        <button
          className="panel-max"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMax();
          }}
        >
          {maximized ? "❐" : "□"}
        </button>
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
