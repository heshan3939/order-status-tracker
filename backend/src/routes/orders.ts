import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { processEvent, listOrders, getOrderWithHistory } from '../db/orderService';
import { Status } from '../domain/orderStatus';

export const ordersRouter = Router();

const statusEnum = z.enum(['created', 'paid', 'shipped', 'delivered', 'cancelled']);

const orderEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  status: statusEnum,
  timestamp: z.string().datetime(),
});

ordersRouter.post('/webhooks/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = orderEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.issues });
    }

    const { eventId, orderId, status, timestamp } = parsed.data;

    const result = await processEvent({
      eventId,
      orderId,
      status: status as Status,
      timestamp,
    });

    if (result.kind === 'accepted') {
      return res.status(201).json({ status: 'accepted', finalStatus: result.status });
    } else if (result.kind === 'duplicate') {
      return res.status(200).json({ status: 'duplicate' });
    } else if (result.kind === 'rejected') {
      console.warn(`[Rejected Event] eventId=${eventId}, orderId=${orderId}, status=${status}, reason: ${result.reason}`);
      return res.status(409).json({ status: 'rejected', reason: result.reason });
    }
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusQuery = req.query.status as string | undefined;
    let filterStatus: Status | undefined = undefined;

    if (statusQuery) {
      const parsedStatus = statusEnum.safeParse(statusQuery);
      if (!parsedStatus.success) {
        return res.status(400).json({ error: 'Unknown status' });
      }
      filterStatus = parsedStatus.data as Status;
    }

    const orders = await listOrders(filterStatus);
    return res.json(orders);
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const orderData = await getOrderWithHistory(id);
    
    if (!orderData) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Ensure event history is correctly sorted by timestamp
    orderData.events.sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());

    return res.json(orderData);
  } catch (error) {
    next(error);
  }
});
