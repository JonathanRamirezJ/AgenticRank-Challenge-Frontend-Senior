import { memo, useMemo } from "react";
import type { Filters, Order } from "../types";
import { OrderRow } from "./OrderRow";
import "./OrderList.css";

interface Props {
  orders: Order[];
  filters: Filters;
}

const CURRENCY_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function matchesFilters(order: Order, filters: Filters): boolean {
  if (filters.restaurantName && order.restaurantName !== filters.restaurantName) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(order.status.kind)) {
    return false;
  }
  if (filters.query.trim() !== "") {
    const q = filters.query.toLowerCase();
    const inCustomer = order.customerName.toLowerCase().includes(q);
    const inRestaurant = order.restaurantName.toLowerCase().includes(q);
    const inItems = order.items.some((it) => it.name.toLowerCase().includes(q));
    if (!inCustomer && !inRestaurant && !inItems) return false;
  }
  return true;
}

function OrderListBase({ orders, filters }: Props) {
  const filtered = useMemo(
    () =>
      orders
        .filter((o) => matchesFilters(o, filters))
        .sort((a, b) => b.total - a.total),
    [orders, filters],
  );

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, o) => sum + o.total, 0),
    [filtered],
  );

  return (
    <section className="order-list">
      <header className="order-list__header">
        <h2 className="order-list__title">Orders</h2>
        <div className="order-list__stats">
          <span>
            <strong>{filtered.length}</strong> shown
          </span>
          <span>
            <strong>{CURRENCY_FMT.format(totalRevenue / 100)}</strong> revenue
          </span>
        </div>
      </header>
      <ul className="order-list__items">
        {filtered.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="order-list__empty">No orders match the current filters.</p>
      ) : null}
    </section>
  );
}

export const OrderList = memo(OrderListBase);
