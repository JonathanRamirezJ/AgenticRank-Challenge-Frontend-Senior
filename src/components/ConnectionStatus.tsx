import type { ConnectionState } from "../types";

interface Props {
  status: ConnectionState;
  isStale: boolean;
}

const LABEL: Record<ConnectionState, string> = {
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Disconnected",
  reconnecting: "Reconnecting…",
};

export function ConnectionStatus({ status, isStale }: Props) {
  const showStale = isStale && status === "connected";
  const label = showStale ? "Stale" : LABEL[status];
  const variant = showStale ? "stale" : status;
  return (
    <span className={`connection connection--${variant}`} role="status">
      {label}
    </span>
  );
}
