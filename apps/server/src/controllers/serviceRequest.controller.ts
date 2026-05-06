import { Request, Response } from 'express';
import { body } from 'express-validator';
import ServiceRequest from '../models/ServiceRequest';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { emitServiceRequest, emitServiceUpdated } from '../services/socket.service';

const VALID_TYPES = [
  'laundry', 'towels', 'pillows', 'water', 'housekeeping',
  'maintenance', 'iron', 'wake_up', 'turndown', 'do_not_disturb',
];

export const createRequestValidation = [
  body('type').isIn(VALID_TYPES).withMessage('Invalid service type'),
  body('notes').optional().isString().isLength({ max: 200 }),
];

export async function createRequest(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;
  const { type, notes } = req.body;

  const request = await ServiceRequest.create({
    guest: guest._id,
    room:  guest.room,
    type,
    notes: notes?.trim() || undefined,
  });

  const populated = await request.populate([
    { path: 'guest', select: 'name' },
    { path: 'room',  select: 'roomNumber name' },
  ]);

  emitServiceRequest(populated.toObject());

  res.status(201).json({ success: true, request: populated });
}

export async function listRequests(req: Request, res: Response): Promise<void> {
  const { status, active } = req.query;

  const filter: Record<string, unknown> = {};
  if (status) {
    filter.status = status;
  } else if (active === 'true') {
    filter.status = { $in: ['pending', 'acknowledged'] };
  }

  const requests = await ServiceRequest.find(filter)
    .populate('guest', 'name')
    .populate('room',  'roomNumber name')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ success: true, requests });
}

export async function listMyRequests(req: AuthRequest, res: Response): Promise<void> {
  const guest = req.guest!;

  const requests = await ServiceRequest.find({ guest: guest._id })
    .populate('room', 'roomNumber name')
    .sort({ createdAt: -1 });

  res.json({ success: true, requests });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  if (!['acknowledged', 'done'].includes(status)) throw new AppError('Invalid status', 400);

  const request = await ServiceRequest.findById(id);
  if (!request) throw new AppError('Service request not found', 404);

  if (status === 'acknowledged') {
    if (request.status !== 'pending') throw new AppError('Can only acknowledge pending requests', 400);
    request.acknowledgedAt = new Date();
  } else {
    if (request.status === 'done') throw new AppError('Already completed', 400);
    request.completedAt = new Date();
  }

  request.status = status;
  await request.save();

  const populated = await request.populate([
    { path: 'guest', select: 'name' },
    { path: 'room',  select: 'roomNumber name' },
  ]);

  emitServiceUpdated(populated.toObject());

  res.json({ success: true, request: populated });
}
