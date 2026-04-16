import { Request, Response } from 'express';
import { body } from 'express-validator';
import Order from '../models/Order';
import MenuItem from '../models/MenuItem';
import Offer from '../models/Offer';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { addLineItem } from '../services/billing.service';
import { emitOrderUpdate, emitNewOrder, emitOrderAssigned } from '../services/socket.service';

export const orderValidation = [
  body('items').isArray({ min: 1 }),
  body('items.*.menuItem').isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }),
];

export async function placeOrder(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const { items, notes } = req.body;

  // Check for an active offer with a food discount
  const now = new Date();
  const activeOffer = await Offer.findOne({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const foodDiscountMultiplier = activeOffer?.foodDiscount ? (1 - activeOffer.foodDiscount / 100) : 1;

  // Validate items and calculate total
  const enrichedItems = await Promise.all(
    items.map(async (item: { menuItem: string; quantity: number; specialInstructions?: string }) => {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) throw new AppError(`Menu item not available`, 400);
      const unitPrice = Math.round(menuItem.price * foodDiscountMultiplier * 100) / 100;
      return {
        menuItem: menuItem._id,
        quantity: item.quantity,
        unitPrice,
        specialInstructions: item.specialInstructions || '',
      };
    })
  );

  const totalAmount = enrichedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const order = await Order.create({
    guest: guest._id,
    room: guest.room,
    items: enrichedItems,
    totalAmount,
    notes,
  });

  const populated = await order.populate([
    { path: 'items.menuItem', select: 'name image' },
    { path: 'room', select: 'roomNumber name' },
  ]);

  emitNewOrder(populated.toObject());

  res.status(201).json({ success: true, order: populated });
}

export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const orders = await Order.find({ guest: req.guest!._id })
    .populate('items.menuItem', 'name image price')
    .sort('-placedAt');
  res.json({ success: true, orders });
}

export async function getAllOrders(req: Request, res: Response): Promise<void> {
  const { status } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('items.menuItem', 'name price')
    .populate('guest', 'name room')
    .populate('room', 'roomNumber name')
    .sort('-placedAt');
  res.json({ success: true, orders });
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['delivering'],
  delivering: ['delivered'],
};

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400);
  }

  order.status = status;
  const now = new Date();
  if (status === 'accepted') order.acceptedAt = now;
  if (status === 'preparing') order.preparedAt = now;
  if (status === 'delivered') {
    order.deliveredAt = now;
    // Add to bill
    const totalDesc = `Room service order #${order._id}`;
    const guestDoc = await (await import('../models/Guest')).default.findById(order.guest);
    if (!guestDoc?.bill) throw new AppError('Guest bill not found', 404);
    await addLineItem(
      guestDoc.bill as any,
      String(order.guest),
      'food_order',
      totalDesc,
      order.totalAmount,
      order._id as any
    );
    order.addedToBill = true;
  }
  await order.save();

  emitOrderUpdate(String(order.guest), String(order._id), status);
  res.json({ success: true, order });
}

export async function cancelOrder(req: AuthRequest, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  if (!['pending', 'accepted'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled';
  await order.save();

  emitOrderUpdate(String(order.guest), String(order._id), 'cancelled');
  res.json({ success: true, order });
}

export async function assignWaiter(req: AuthRequest, res: Response): Promise<void> {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { servedBy: req.user!._id },
    { new: true }
  );
  if (!order) throw new AppError('Order not found', 404);
  emitOrderAssigned(String(order._id), String(req.user!._id));
  res.json({ success: true, order });
}
