import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import Review from '../models/Review';
import Order from '../models/Order';
import SpaBooking from '../models/SpaBooking';
import Guest from '../models/Guest';

// ── Validation ────────────────────────────────────────────────────────────────

export const reviewValidation = [
  body('roomRating').optional().isInt({ min: 1, max: 5 }).withMessage('roomRating must be 1–5'),
  body('foodRating').optional().isInt({ min: 1, max: 5 }).withMessage('foodRating must be 1–5'),
  body('spaRating').optional().isInt({ min: 1, max: 5 }).withMessage('spaRating must be 1–5'),
  body('roomFeedback').optional().isString().trim().isLength({ max: 1000 }),
  body('foodFeedback').optional().isString().trim().isLength({ max: 1000 }),
  body('spaFeedback').optional().isString().trim().isLength({ max: 1000 }),
];

// ── GET /reviews/eligible — which depts can this guest rate? ─────────────────

export async function getEligible(req: AuthRequest, res: Response) {
  const guest = req.guest!;

  const [deliveredOrders, completedSpa, existingReview] = await Promise.all([
    Order.countDocuments({ guest: guest._id, status: 'delivered' }),
    SpaBooking.countDocuments({ guest: guest._id, status: 'completed' }),
    Review.findOne({ guest: guest._id, reservation: guest.reservation }),
  ]);

  return res.json({
    success: true,
    eligible: {
      room: true,           // always — they're staying in a room
      food: deliveredOrders > 0,
      spa:  completedSpa > 0,
    },
    existing: existingReview ?? null,
  });
}

// ── POST /reviews — submit or update review during active stay ───────────────

export async function submitReview(req: AuthRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg as string, 422);

  const guest = req.guest!;
  const { roomRating, roomFeedback, foodRating, foodFeedback, spaRating, spaFeedback } = req.body;

  // Validate: food rating requires a delivered order
  if (foodRating !== undefined) {
    const count = await Order.countDocuments({ guest: guest._id, status: 'delivered' });
    if (count === 0) throw new AppError('Cannot rate food — no delivered orders on this stay', 400);
  }

  // Validate: spa rating requires a completed booking
  if (spaRating !== undefined) {
    const count = await SpaBooking.countDocuments({ guest: guest._id, status: 'completed' });
    if (count === 0) throw new AppError('Cannot rate spa — no completed spa sessions on this stay', 400);
  }

  // At least one rating must be provided
  if (roomRating === undefined && foodRating === undefined && spaRating === undefined) {
    throw new AppError('At least one department rating is required', 400);
  }

  // Compute overall = average of submitted department ratings
  const submitted = [roomRating, foodRating, spaRating].filter((r) => r !== undefined) as number[];
  const overallRating = Math.round((submitted.reduce((a, b) => a + b, 0) / submitted.length) * 10) / 10;

  // Upsert — guest can update until checkout
  const review = await Review.findOneAndUpdate(
    { guest: guest._id, reservation: guest.reservation },
    {
      guest: guest._id,
      reservation: guest.reservation,
      ...(roomRating !== undefined && { roomRating, roomFeedback: roomFeedback ?? '' }),
      ...(foodRating !== undefined && { foodRating, foodFeedback: foodFeedback ?? '' }),
      ...(spaRating  !== undefined && { spaRating,  spaFeedback:  spaFeedback  ?? '' }),
      overallRating,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(201).json({ success: true, review });
}

// ── GET /reviews/public — visible reviews for public display ─────────────────

export async function getPublicReviews(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const reviews = await Review.find({ isHidden: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('guest', 'name')
    .lean();

  // Compute per-department averages across all visible reviews
  const all = await Review.find({ isHidden: false }).lean();

  const avg = (field: 'roomRating' | 'foodRating' | 'spaRating') => {
    const vals = all.map((r) => r[field]).filter((v): v is number => v !== undefined);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  return res.json({
    success: true,
    reviews,
    stats: {
      total: all.length,
      overall: avg('roomRating') !== null
        ? Math.round((all.reduce((s, r) => s + r.overallRating, 0) / all.length) * 10) / 10
        : null,
      room: avg('roomRating'),
      food: avg('foodRating'),
      spa:  avg('spaRating'),
    },
  });
}

// ── GET /reviews — admin: all reviews with filters ───────────────────────────

export async function listReviews(req: AuthRequest, res: Response) {
  const page     = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 25, 100);
  const hidden   = req.query.hidden;  // 'true' | 'false' | undefined = all
  const bad      = req.query.bad === 'true'; // filter ≤2 stars in any dept

  const filter: Record<string, any> = {};
  if (hidden === 'true')  filter.isHidden = true;
  if (hidden === 'false') filter.isHidden = false;
  if (bad) {
    filter.$or = [
      { roomRating: { $lte: 2 } },
      { foodRating: { $lte: 2 } },
      { spaRating:  { $lte: 2 } },
    ];
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('guest', 'name email')
      .populate('reservation', 'bookingRef checkInDate checkOutDate')
      .lean(),
    Review.countDocuments(filter),
  ]);

  return res.json({ success: true, reviews, total, page, pageSize });
}

// ── PATCH /reviews/:id/visibility — admin hide/show ──────────────────────────

export async function toggleVisibility(req: AuthRequest, res: Response) {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  review.isHidden = !review.isHidden;
  await review.save();

  return res.json({ success: true, isHidden: review.isHidden });
}
