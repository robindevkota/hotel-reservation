import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export function initSocket(server: HTTPServer): void {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'https://royalsuitesnp.com',
        'https://www.royalsuitesnp.com',
        'https://hotel-reservation-web-eight.vercel.app',
      ].filter(Boolean) as string[]
    : true; // allow all in development

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Guest joins their personal room for order updates
    socket.on('join:guest-room', (guestId: string) => {
      socket.join(`guest:${guestId}`);
    });

    // Kitchen staff joins kitchen board
    socket.on('join:kitchen', () => {
      socket.join('kitchen');
    });

    // Admin joins admin room
    socket.on('join:admin', () => {
      socket.join('admin');
    });

    socket.on('disconnect', () => {});
  });
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Emit helpers
export function emitOrderUpdate(guestId: string, orderId: string, status: string): void {
  getIO().to(`guest:${guestId}`).emit('order:status-update', { orderId, status });
}

export function emitNewOrder(order: object): void {
  getIO().to('kitchen').emit('order:new', order);
  getIO().to('admin').emit('order:new', order);
}

export function emitOrderAssigned(orderId: string, waiter: string): void {
  getIO().to('kitchen').emit('order:assigned', { orderId, waiter });
}

export function emitBillUpdated(guestId: string, totalAmount: number): void {
  getIO().to(`guest:${guestId}`).emit('bill:updated', { totalAmount });
}

export function emitSpaConfirmed(guestId: string, bookingId: string): void {
  getIO().to(`guest:${guestId}`).emit('spa:booking-confirmed', { bookingId });
}

export function emitNotification(room: string, message: string): void {
  getIO().to(room).emit('notification:general', { message });
}
