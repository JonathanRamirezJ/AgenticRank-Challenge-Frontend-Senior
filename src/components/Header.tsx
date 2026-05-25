import type { ConnectionState } from "../types";
import { ConnectionStatus } from "./ConnectionStatus";

interface Props {
  status: ConnectionState;
  isStale: boolean;
}

export function Header({ status, isStale }: Props) {
  const live = status === "connected" && !isStale;
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__title">LiveBoard</span>
        <span
          className={`header__dot header__dot--${live ? "on" : "off"}`}
          aria-hidden="true"
        />
      </div>
      <ConnectionStatus status={status} isStale={isStale} />
    </header>
  );
}
