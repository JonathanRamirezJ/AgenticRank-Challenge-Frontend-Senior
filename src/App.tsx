import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchInitialOrders } from "./api";
import { FilterBar } from "./components/FilterBar";
import { Header } from "./components/Header";
import { OrderList } from "./components/OrderList";
import { OrdersPerMinuteChart } from "./components/OrdersPerMinuteChart";
import { useOrderStream } from "./hooks/useOrderStream";
import type { Filters, Order } from "./types";
import "./App.css";

const EMPTY_FILTERS: Filters = {
  query: "",
  statuses: [],
  restaurantName: null,
};

export const MAX_ORDERS_IN_MEMORY = 500;

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInitialOrders()
      .then((initial) => {
        if (!cancelled) setOrders(initial.slice(0, MAX_ORDERS_IN_MEMORY));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev].slice(0, MAX_ORDERS_IN_MEMORY));
  }, []);

  const { status } = useOrderStream(handleOrder);

  const restaurants = useMemo(
    () => Array.from(new Set(orders.map((o) => o.restaurantName))).sort(),
    [orders],
  );

  return (
    <div className="app">
      <Header status={status} />
      <main className="app__main">
        {loadError ? (
          <div className="app__error">Failed to load orders: {loadError}</div>
        ) : null}
        <FilterBar restaurants={restaurants} onChange={setFilters} />
        <OrdersPerMinuteChart orders={orders} />
        <OrderList orders={orders} filters={filters} />
      </main>
    </div>
  );
}
