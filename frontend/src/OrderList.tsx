import type { Order } from './api';

interface OrderListProps {
  orders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const STATUS_OPTIONS: string[] = ['All', 'created', 'paid', 'shipped', 'delivered', 'cancelled'];

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  statusFilter,
  onStatusFilterChange,
  loading,
  error,
  onRetry,
}) => {
  return (
    <div style={{ flex: 1, padding: '1rem', borderRight: '1px solid #ccc' }}>
      <h2>Orders</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="status-filter" style={{ marginRight: '0.5rem' }}>Filter by Status:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {error && (
        <div style={{ color: 'red', margin: '1rem 0' }}>
          <p>Error: {error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && <p>No orders found</p>}

      {!loading && !error && orders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px' }}>Order ID</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              return (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e0f7fa' : 'transparent',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td style={{ padding: '8px' }}>{order.id}</td>
                  <td style={{ padding: '8px' }}>{order.status}</td>
                  <td style={{ padding: '8px' }}>{new Date(order.updated_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
