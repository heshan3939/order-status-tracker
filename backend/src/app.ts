import express, { Request, Response, NextFunction } from 'express';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';

const app = express();

app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/', ordersRouter);

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
