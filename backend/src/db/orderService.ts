import { pool } from './index';
import { OrderEvent, sortTimeline, validateTimeline, Status } from '../domain/orderStatus';

export type ProcessResult =
  | { kind: 'accepted'; status: Status }
  | { kind: 'duplicate' }
  | { kind: 'rejected'; reason: string };

export async function processEvent(event: OrderEvent & { orderId: string }): Promise<ProcessResult> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Ensure the order row exists (create placeholder if needed) and lock it.
    // We use INSERT ... ON DUPLICATE KEY UPDATE to ensure a row exists.
    await connection.query(
      `INSERT INTO orders (id, status, updated_at) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE id = id`,
      [event.orderId, event.status, new Date(event.timestamp)]
    );

    // SELECT ... FOR UPDATE serializes concurrent events for the same order.
    // By locking the row here, any other transaction trying to process an event
    // for this order will block until this transaction completes.
    await connection.query(
      `SELECT id FROM orders WHERE id = ? FOR UPDATE`,
      [event.orderId]
    );

    // 2. Insert the event. If the event_id already exists, ER_DUP_ENTRY is thrown.
    // We catch it and idempotently return a 'duplicate' response.
    try {
      await connection.query(
        `INSERT INTO events (event_id, order_id, status, event_timestamp)
         VALUES (?, ?, ?, ?)`,
        [event.eventId, event.orderId, event.status, new Date(event.timestamp)]
      );
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return { kind: 'duplicate' };
      }
      throw error;
    }

    // 3. Load all events for this order to reconstruct the timeline
    const [rows] = await connection.query<any[]>(
      `SELECT event_id as eventId, status, event_timestamp as timestamp
       FROM events
       WHERE order_id = ?`,
      [event.orderId]
    );

    // Re-evaluate the timeline using the pure domain logic
    const sorted = sortTimeline(rows);
    const statuses = sorted.map((e) => e.status);
    const validation = validateTimeline(statuses);

    // 4. If the resulting timeline is invalid, we roll back everything.
    // The event is not persisted, and we reject the transition.
    if (!validation.ok) {
      await connection.rollback();
      return { kind: 'rejected', reason: validation.reason! };
    }

    // 5. Otherwise, the timeline is valid. Update the order's top-level status
    // to match the final status of the sorted timeline.
    const finalEvent = sorted[sorted.length - 1];
    await connection.query(
      `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
      [finalEvent.status, new Date(finalEvent.timestamp), event.orderId]
    );

    await connection.commit();
    return { kind: 'accepted', status: finalEvent.status };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // Return connection to the pool
  }
}

export async function listOrders(status?: Status) {
  let query = `SELECT id, status, updated_at FROM orders`;
  const params: any[] = [];
  
  if (status) {
    query += ` WHERE status = ?`;
    params.push(status);
  }
  query += ` ORDER BY updated_at DESC`;
  
  const [rows] = await pool.query(query, params);
  return rows;
}

export async function getOrderWithHistory(id: string) {
  const [orderRows] = await pool.query<any[]>(
    `SELECT id, status, updated_at FROM orders WHERE id = ?`,
    [id]
  );
  
  if (orderRows.length === 0) {
    return null;
  }

  const [eventRows] = await pool.query<any[]>(
    `SELECT event_id, status, event_timestamp, received_at 
     FROM events 
     WHERE order_id = ? 
     ORDER BY event_timestamp ASC`, // Initial sorting for convenience, but domain layer sorts again if needed
    [id]
  );

  return {
    order: orderRows[0],
    events: eventRows
  };
}
