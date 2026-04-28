import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db';
import { initSocket } from './services/socket.service';
import { errorHandler } from './middleware/errorHandler';
import { syncAllChannels } from './services/ical.service';
import logger from './config/logger';

// Routes
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import reservationRoutes from './routes/reservation.routes';
import checkinRoutes from './routes/checkin.routes';
import qrRoutes from './routes/qr.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import spaRoutes from './routes/spa.routes';
import billingRoutes from './routes/billing.routes';
import paymentRoutes from './routes/payment.routes';
import analyticsRoutes from './routes/analytics.routes';
import inventoryRoutes from './routes/inventory.routes';
import categoryRoutes from './routes/category.routes';
import offerRoutes from './routes/offer.routes';
import walkInCustomerRoutes from './routes/walkInCustomer.routes';
import channelRoutes from './routes/channel.routes';
import settingsRoutes from './routes/settings.routes';
import reviewRoutes from './routes/review.routes';
import contactRoutes from './routes/contact.routes';

const app = express();
const server = http.createServer(app);

// Init Socket.io
initSocket(server);

// Security middleware
app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : ['http://localhost:3000']),
      'https://royalsuitesnp.com',
      'https://www.royalsuitesnp.com',
      'https://hotel-reservation-web-eight.vercel.app',
    ].filter(Boolean) as string[]
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : [])].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Raw body for Stripe webhooks (before json parser)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 50,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/spa', spaRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/room-categories', categoryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/walkin-customers', walkInCustomerRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Royal Suites server running on port ${PORT}`);
  });

  // Poll OTA iCal feeds every 20 minutes
  const SYNC_INTERVAL = 20 * 60 * 1000;
  setTimeout(() => {
    syncAllChannels();
    setInterval(syncAllChannels, SYNC_INTERVAL);
  }, 10000); // wait 10s for DB to settle after boot
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { stack: err.stack });
  process.exit(1);
});
