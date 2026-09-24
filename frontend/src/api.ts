export type Status = 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  status: Status;
  updated_at: string;
}

export interface OrderEvent {
  event_id: string;
  status: Status;
  event_timestamp: string;
  received_at?: string;
}

export interface OrderDetail {
  order: Order;
  events: OrderEvent[];
}

export async function fetchOrders(status?: string, signal?: AbortSignal): Promise<Order[]> {
  const url = status && status !== 'All' ? `/orders?status=${encodeURIComponent(status)}` : '/orders';
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to fetch orders (${res.status}): ${errorText}`);
  }
  return res.json();
}

export async function fetchOrder(id: string, signal?: AbortSignal): Promise<OrderDetail> {
  const res = await fetch(`/orders/${encodeURIComponent(id)}`, { signal });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Order "${id}" not found.`);
    }
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to fetch order detail (${res.status}): ${errorText}`);
  }
  return res.json();
}
