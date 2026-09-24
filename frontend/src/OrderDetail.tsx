import React from 'react';
import { useFetch } from './useFetch';
import { fetchOrder } from './api';

interface OrderDetailProps {
  orderId: string | null;
  onClose: () => void;
}

export const OrderDetail: React.FC<OrderDetailProps> = ({ orderId, onClose }) => {
  if (!orderId) {
    return (
      <div style={{ flex: 1, padding: '1rem' }}>
        <p>Select an order to view details.</p>
      </div>
    );
  }

  const { data, loading, error, retry } = useFetch(
    (signal) => fetchOrder(orderId, signal),
    [orderId]
  );

  return (
    <div style={{ flex: 1, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Order Details</h2>
        <button onClick={onClose}>Close</button>
      </div>

      {loading && <p>Loading...</p>}

      {error && (
        <div style={{ color: 'red', margin: '1rem 0' }}>
          <p>Error: {error}</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}

      {!loading && !error && !data && <p>No orders found</p>}

      {!loading && !error && data && (
        <div>
          <div style={{ marginBottom: '1.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>Order ID:</strong> {data.order.id}</p>
            <p><strong>Status:</strong> {data.order.status}</p>
            <p><strong>Last Updated:</strong> {new Date(data.order.updated_at).toLocaleString()}</p>
          </div>

          <h3>Event History</h3>
          {data.events.length === 0 ? (
            <p>No orders found</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Event Timestamp</th>
                  <th style={{ padding: '8px' }}>Event ID</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((evt) => (
                  <tr key={evt.event_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{evt.status}</td>
                    <td style={{ padding: '8px' }}>{new Date(evt.event_timestamp).toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{evt.event_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
