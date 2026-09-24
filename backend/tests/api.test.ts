import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import app from '../src/app';
import { pool } from '../src/db/index';

describe('API Tests', () => {
  beforeAll(async () => {
    // Set up the test database
    const dbName = process.env.DB_NAME_TEST || 'orders_test';
    
    const tempConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await tempConn.query(`USE \`${dbName}\`;`);
    
    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await tempConn.query(schema);
    
    await tempConn.end();
  });

  beforeEach(async () => {
    // Delete events first, then orders due to foreign key
    await pool.query('DELETE FROM events');
    await pool.query('DELETE FROM orders');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('1. duplicate eventId returns 200 and only one event is stored', async () => {
    const event = {
      eventId: 'evt_1',
      orderId: 'ord_1',
      status: 'created',
      timestamp: new Date().toISOString()
    };

    const res1 = await request(app).post('/webhooks/orders').send(event);
    expect(res1.status).toBe(201);
    expect(res1.body.finalStatus).toBe('created');

    const res2 = await request(app).post('/webhooks/orders').send(event);
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('duplicate');

    const [rows] = await pool.query<any[]>('SELECT * FROM events WHERE order_id = ?', ['ord_1']);
    expect(rows.length).toBe(1);
  });

  it('2. events sent as shipped, paid, created (with matching timestamps) end with status shipped and history returned in timestamp order', async () => {
    const ts1 = new Date('2023-01-01T10:00:00Z').toISOString();
    const ts2 = new Date('2023-01-01T10:01:00Z').toISOString();
    const ts3 = new Date('2023-01-01T10:02:00Z').toISOString();

    const orderId = 'ord_2';
    
    await request(app).post('/webhooks/orders').send({ eventId: 'e3', orderId, status: 'shipped', timestamp: ts3 });
    await request(app).post('/webhooks/orders').send({ eventId: 'e2', orderId, status: 'paid', timestamp: ts2 });
    const finalRes = await request(app).post('/webhooks/orders').send({ eventId: 'e1', orderId, status: 'created', timestamp: ts1 });

    expect(finalRes.status).toBe(201);
    expect(finalRes.body.finalStatus).toBe('shipped');

    const getRes = await request(app).get(`/orders/${orderId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.order.status).toBe('shipped');
    expect(getRes.body.events.length).toBe(3);
    
    // Check they are in timestamp order
    expect(getRes.body.events[0].status).toBe('created');
    expect(getRes.body.events[1].status).toBe('paid');
    expect(getRes.body.events[2].status).toBe('shipped');
  });

  it('3. cancelled after shipped returns 409 and leaves the order unchanged', async () => {
    const orderId = 'ord_3';
    await request(app).post('/webhooks/orders').send({ eventId: 'e1', orderId, status: 'created', timestamp: new Date('2023-01-01T10:00:00Z').toISOString() });
    await request(app).post('/webhooks/orders').send({ eventId: 'e2', orderId, status: 'paid', timestamp: new Date('2023-01-01T10:01:00Z').toISOString() });
    await request(app).post('/webhooks/orders').send({ eventId: 'e3', orderId, status: 'shipped', timestamp: new Date('2023-01-01T10:02:00Z').toISOString() });

    const cancelRes = await request(app).post('/webhooks/orders').send({ eventId: 'e4', orderId, status: 'cancelled', timestamp: new Date('2023-01-01T10:03:00Z').toISOString() });
    
    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.reason).toContain('Cannot cancel');

    const getRes = await request(app).get(`/orders/${orderId}`);
    expect(getRes.body.order.status).toBe('shipped');
  });

  it('4. any event after delivered returns 409', async () => {
    const orderId = 'ord_4';
    await request(app).post('/webhooks/orders').send({ eventId: 'e1', orderId, status: 'created', timestamp: new Date('2023-01-01T10:00:00Z').toISOString() });
    await request(app).post('/webhooks/orders').send({ eventId: 'e2', orderId, status: 'delivered', timestamp: new Date('2023-01-01T10:04:00Z').toISOString() });

    const afterDeliveredRes = await request(app).post('/webhooks/orders').send({ eventId: 'e3', orderId, status: 'shipped', timestamp: new Date('2023-01-01T10:05:00Z').toISOString() });
    
    expect(afterDeliveredRes.status).toBe(409);
    expect(afterDeliveredRes.body.reason).toContain('after delivered');
  });

  it('5. a late paid event with an earlier timestamp does not move a shipped order backwards', async () => {
    const orderId = 'ord_5';
    // Event arrives out of order
    await request(app).post('/webhooks/orders').send({ eventId: 'e1', orderId, status: 'created', timestamp: new Date('2023-01-01T10:00:00Z').toISOString() });
    await request(app).post('/webhooks/orders').send({ eventId: 'e3', orderId, status: 'shipped', timestamp: new Date('2023-01-01T10:02:00Z').toISOString() });

    // Late paid event arrives, but timestamp is before shipped
    const latePaidRes = await request(app).post('/webhooks/orders').send({ eventId: 'e2', orderId, status: 'paid', timestamp: new Date('2023-01-01T10:01:00Z').toISOString() });
    
    expect(latePaidRes.status).toBe(201);
    expect(latePaidRes.body.finalStatus).toBe('shipped'); // The order's final status is still shipped

    const getRes = await request(app).get(`/orders/${orderId}`);
    expect(getRes.body.order.status).toBe('shipped');
    
    // Check events in history are sorted
    expect(getRes.body.events.map((e: any) => e.status)).toEqual(['created', 'paid', 'shipped']);
  });

  it('6. invalid body returns 400', async () => {
    const res = await request(app).post('/webhooks/orders').send({
      eventId: '',
      orderId: 'ord_6',
      status: 'unknown_status',
      timestamp: 'not-iso-8601'
    });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid body');
    expect(res.body.details).toBeDefined();
  });

  it('7. GET /orders?status= filter works, an unknown status returns 400', async () => {
    // Create an order
    await request(app).post('/webhooks/orders').send({ eventId: 'e1', orderId: 'ord_7', status: 'created', timestamp: new Date().toISOString() });
    
    const validRes = await request(app).get('/orders?status=created');
    expect(validRes.status).toBe(200);
    expect(Array.isArray(validRes.body)).toBe(true);
    expect(validRes.body.some((o: any) => o.id === 'ord_7')).toBe(true);

    const invalidRes = await request(app).get('/orders?status=invalid_status');
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe('Unknown status');
  });

  it('8. GET /orders/:id for an unknown id returns 404', async () => {
    const res = await request(app).get('/orders/non_existent_id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });
});
