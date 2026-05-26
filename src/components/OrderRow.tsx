import { memo } from "react";
import type { Order, StatusKind } from "../types";

interface Props {
  order: Order;
}

const STATUS_CLASS: Record<StatusKind, string> = {
  pending: "order-row__badge--pending",
  preparing: "order-row__badge--preparing",
  ready: "order-row__badge--ready",
  delivered: "order-row__badge--delivered",
  cancelled: "order-row__badge--cancelled",
};

const CURRENCY_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  month: "short",
  day: "numeric",
});

function statusTimestamp(order: Order): string {
  switch (order.status.kind) {
    case "pending":
      return order.status.placedAt;
    case "preparing":
      return order.status.startedAt;
    case "ready":
      return order.status.readyAt;
    case "delivered":
      return order.status.deliveredAt;
    case "cancelled":
      return order.status.cancelledAt;
  }
}

function OrderRowBase({ order }: Props) {
  const formattedTotal = CURRENCY_FMT.format(order.total / 100);
  const formattedTs = DATE_FMT.format(new Date(statusTimestamp(order)));
  const itemSummary = order.items
    .map((it) => `${it.quantity}× ${it.name}`)
    .join(", ");

  return (
    <li className="order-row">
      <div className="order-row__main">
        <div className="order-row__top">
          <span className="order-row__customer">{order.customerName}</span>
          <span className={`order-row__badge ${STATUS_CLASS[order.status.kind]}`}>
            {order.status.kind}
          </span>
        </div>
        <div className="order-row__sub">
          <span className="order-row__restaurant">{order.restaurantName}</span>
          <span className="order-row__dot">·</span>
          <span className="order-row__items">{itemSummary}</span>
        </div>
      </div>
      <div className="order-row__meta">
        <span className="order-row__total">{formattedTotal}</span>
        <span className="order-row__ts">{formattedTs}</span>
      </div>
    </li>
  );
}

export const OrderRow = memo(OrderRowBase);
