const BASE_URL = process.env.API_URL || 'http://localhost:3000/webhooks/orders';

interface EventPayload {
  eventId: string;
  orderId: string;
  status: 'created' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  timestamp: string;
}

async function sendEvent(description: string, payload: EventPayload) {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`[HTTP ${response.status}] ${description}:`, data);
  } catch (error: any) {
    console.error(`[ERROR] ${description}:`, error.message);
  }
}

async function runSeed() {
  console.log('--- Starting Order Status Tracker Seed ---');

  // 1. Normal full flow for one order (created, paid, shipped, delivered)
  console.log('\n--- Scenario 1: Normal Full Flow (seed_ord_1) ---');
  await sendEvent('1.1 Created', {
    eventId: 'seed_evt_1_1',
    orderId: 'seed_ord_1',
    status: 'created',
    timestamp: new Date('2023-01-01T10:00:00Z').toISOString(),
  });
  await sendEvent('1.2 Paid', {
    eventId: 'seed_evt_1_2',
    orderId: 'seed_ord_1',
    status: 'paid',
    timestamp: new Date('2023-01-01T10:05:00Z').toISOString(),
  });
  await sendEvent('1.3 Shipped', {
    eventId: 'seed_evt_1_3',
    orderId: 'seed_ord_1',
    status: 'shipped',
    timestamp: new Date('2023-01-01T10:10:00Z').toISOString(),
  });
  await sendEvent('1.4 Delivered', {
    eventId: 'seed_evt_1_4',
    orderId: 'seed_ord_1',
    status: 'delivered',
    timestamp: new Date('2023-01-01T10:15:00Z').toISOString(),
  });

  // 2. Duplicate of one of those events
  console.log('\n--- Scenario 2: Duplicate Event ---');
  await sendEvent('2.1 Resending Paid Event (Duplicate)', {
    eventId: 'seed_evt_1_2',
    orderId: 'seed_ord_1',
    status: 'paid',
    timestamp: new Date('2023-01-01T10:05:00Z').toISOString(),
  });

  // 3. Out-of-order events (shipped, paid, created)
  console.log('\n--- Scenario 3: Out-of-Order Events (seed_ord_3) ---');
  await sendEvent('3.1 Shipped (Arrived 1st)', {
    eventId: 'seed_evt_3_3',
    orderId: 'seed_ord_3',
    status: 'shipped',
    timestamp: new Date('2023-01-01T12:10:00Z').toISOString(),
  });
  await sendEvent('3.2 Paid (Arrived 2nd)', {
    eventId: 'seed_evt_3_2',
    orderId: 'seed_ord_3',
    status: 'paid',
    timestamp: new Date('2023-01-01T12:05:00Z').toISOString(),
  });
  await sendEvent('3.3 Created (Arrived 3rd)', {
    eventId: 'seed_evt_3_1',
    orderId: 'seed_ord_3',
    status: 'created',
    timestamp: new Date('2023-01-01T12:00:00Z').toISOString(),
  });

  // 4. Order cancelled after paid
  console.log('\n--- Scenario 4: Cancelled After Paid (seed_ord_4) ---');
  await sendEvent('4.1 Created', {
    eventId: 'seed_evt_4_1',
    orderId: 'seed_ord_4',
    status: 'created',
    timestamp: new Date('2023-01-01T14:00:00Z').toISOString(),
  });
  await sendEvent('4.2 Paid', {
    eventId: 'seed_evt_4_2',
    orderId: 'seed_ord_4',
    status: 'paid',
    timestamp: new Date('2023-01-01T14:05:00Z').toISOString(),
  });
  await sendEvent('4.3 Cancelled', {
    eventId: 'seed_evt_4_3',
    orderId: 'seed_ord_4',
    status: 'cancelled',
    timestamp: new Date('2023-01-01T14:10:00Z').toISOString(),
  });

  // 5. Invalid cancel-after-shipped (should return 409)
  console.log('\n--- Scenario 5: Invalid Cancel After Shipped (seed_ord_5) ---');
  await sendEvent('5.1 Created', {
    eventId: 'seed_evt_5_1',
    orderId: 'seed_ord_5',
    status: 'created',
    timestamp: new Date('2023-01-01T16:00:00Z').toISOString(),
  });
  await sendEvent('5.2 Paid', {
    eventId: 'seed_evt_5_2',
    orderId: 'seed_ord_5',
    status: 'paid',
    timestamp: new Date('2023-01-01T16:05:00Z').toISOString(),
  });
  await sendEvent('5.3 Shipped', {
    eventId: 'seed_evt_5_3',
    orderId: 'seed_ord_5',
    status: 'shipped',
    timestamp: new Date('2023-01-01T16:10:00Z').toISOString(),
  });
  await sendEvent('5.4 Cancelled (Invalid Transition)', {
    eventId: 'seed_evt_5_4',
    orderId: 'seed_ord_5',
    status: 'cancelled',
    timestamp: new Date('2023-01-01T16:15:00Z').toISOString(),
  });

  console.log('\n--- Seed Execution Completed ---');
}

runSeed();
