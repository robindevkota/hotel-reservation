import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Offer from '../models/Offer';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the currently active offer whose date window covers now, or null. */
async function getActiveOffer() {
  const now = new Date();
  return Offer.findOne({
    isActive: true,
    startDate: { $lte: now },
    endDate:   { $gte: now },
  }).sort({ createdAt: -1 });
}

// ── Validation ───────────────────────────────────────────────────────────────

export const offerValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
  body('roomDiscount').isFloat({ min: 0, max: 100 }).withMessage('roomDiscount must be 0–100'),
  body('foodDiscount').isFloat({ min: 0, max: 100 }).withMessage('foodDiscount must be 0–100'),
  body('spaDiscount').isFloat({ min: 0, max: 100 }).withMessage('spaDiscount must be 0–100'),
];

// ── Public endpoint ───────────────────────────────────────────────────────────

/** GET /api/offers/active — public, used by the guest/public UI on mount */
export async function getActiveOfferPublic(_req: AuthRequest, res: Response) {
  const offer = await getActiveOffer();
  res.json({ offer: offer ?? null });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/** GET /api/offers — list all offers (admin) */
export async function listOffers(_req: AuthRequest, res: Response) {
  const offers = await Offer.find().sort({ createdAt: -1 }).populate('createdBy', 'name email');
  res.json({ offers });
}

/** POST /api/offers — create offer (admin) */
export async function createOffer(req: AuthRequest, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg as string, 400);

  const { title, description, roomDiscount, foodDiscount, spaDiscount, startDate, endDate, isActive } = req.body;

  if (new Date(endDate) <= new Date(startDate)) {
    throw new AppError('endDate must be after startDate', 400);
  }

  const offer = await Offer.create({
    title,
    description: description ?? '',
    roomDiscount: Number(roomDiscount),
    foodDiscount: Number(foodDiscount),
    spaDiscount:  Number(spaDiscount),
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    isActive:  isActive !== undefined ? Boolean(isActive) : true,
    createdBy: req.user!._id,
  });

  res.status(201).json({ offer });
}

/** PATCH /api/offers/:id — update offer (admin) */
export async function updateOffer(req: AuthRequest, res: Response) {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);

  const { title, description, roomDiscount, foodDiscount, spaDiscount, startDate, endDate, isActive } = req.body;

  if (title       !== undefined) offer.title        = title;
  if (description !== undefined) offer.description  = description;
  if (roomDiscount !== undefined) offer.roomDiscount = Number(roomDiscount);
  if (foodDiscount !== undefined) offer.foodDiscount = Number(foodDiscount);
  if (spaDiscount  !== undefined) offer.spaDiscount  = Number(spaDiscount);
  if (startDate   !== undefined) offer.startDate    = new Date(startDate);
  if (endDate     !== undefined) offer.endDate      = new Date(endDate);
  if (isActive    !== undefined) offer.isActive     = Boolean(isActive);

  if (offer.endDate <= offer.startDate) {
    throw new AppError('endDate must be after startDate', 400);
  }

  await offer.save();
  res.json({ offer });
}

/** DELETE /api/offers/:id — delete offer (admin) */
export async function deleteOffer(req: AuthRequest, res: Response) {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  res.json({ message: 'Offer deleted' });
}
