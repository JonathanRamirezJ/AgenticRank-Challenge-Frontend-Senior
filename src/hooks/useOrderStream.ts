import { useEffect, useRef } from "react";
import type { ConnectionState, Order } from "../types";

interface UseOrderStreamResult {
  status: ConnectionState;
}

export function useOrderStream(
  onOrder: (order: Order) => void,
): UseOrderStreamResult {
  const onOrderRef = useRef(onOrder);

  useEffect(() => {
    onOrderRef.current = onOrder;
  });

  useEffect(() => {
    const es = new EventSource("http://localhost:4000/api/orders/stream");
    es.addEventListener("order", (e) => {
      const order = JSON.parse((e as MessageEvent).data) as Order;
      onOrderRef.current(order);
    });
    return () => es.close();
  }, []);

  return { status: "connected" };
}
