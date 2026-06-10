import type { ReactNode } from "react";
import { FUNCTIONS, type PanelState } from "./commands";

export default function Panel({
  index,
  state,
  active,
  maximized,
  onFocus,
  onToggleMax,
  children,
}: {
  index: number;
  state: PanelState;
  active: boolean;
  maximized: boolean;
  onFocus: () => void;
  onToggleMax: () => void;
  children: ReactNode;
}) {
  const title = `${state.ticker ? state.ticker + " " : ""}${state.func} — ${FUNCTIONS[state.func].label}`;
  return (
    <div className={`panel ${active ? "active" : ""}`} onMouseDown={onFocus}>
      <div className="panel-header" onDoubleClick={onToggleMax} title="Double-click to maximize">
        <span className="panel-index">{index + 1}</span>
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
