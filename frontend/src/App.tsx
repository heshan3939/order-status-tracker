import { useState, useCallback } from 'react';
import { fetchOrders } from './api';
import { useFetch } from './useFetch';
import { OrderList } from './OrderList';
import { OrderDetail } from './OrderDetail';

export function App() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetcher = useCallback(
    (signal: AbortSignal) => fetchOrders(statusFilter, signal),
    [statusFilter]
  );

  const { data: orders, loading, error, retry } = useFetch(fetcher, [statusFilter]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Order Status Tracker</h1>
      <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '4px', minHeight: '500px' }}>
        <OrderList
          orders={orders || []}
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          loading={loading}
          error={error}
          onRetry={retry}
        />
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      </div>
    </div>
  );
}

export default App;
