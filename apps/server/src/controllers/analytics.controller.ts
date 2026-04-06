import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Reservation from '../models/Reservation';
import Order from '../models/Order';
import SpaBooking from '../models/SpaBooking';
import Room from '../models/Room';
import Bill from '../models/Bill';

export async function getDashboardAnalytics(req: AuthRequest, res: Response) {
  const department = req.userDepartment ?? null;
  const isSuperAdmin = req.userRole === 'super_admin';
  const now = new Date();
  const startOf30Days = new Date(now);
  startOf30Days.setDate(now.getDate() - 29);
  startOf30Days.setHours(0, 0, 0, 0);

  const startOf7Days = new Date(now);
  startOf7Days.setDate(now.getDate() - 6);
  startOf7Days.setHours(0, 0, 0, 0);

  // ── Department scope helpers ───────────────────────────────────────────────
  const showRooms = isSuperAdmin || department === 'front_desk';
  const showFood  = isSuperAdmin || department === 'food';
  const showSpa   = isSuperAdmin || department === 'spa';

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [
    totalRooms,
    availableRooms,
    allReservations,
    recentReservations,
    allOrders,
    pendingOrders,
    spaBookings,
    paidBills,
  ] = await Promise.all([
    showRooms ? Room.countDocuments({}) : Promise.resolve(0),
    showRooms ? Room.countDocuments({ isAvailable: true }) : Promise.resolve(0),
    showRooms ? Reservation.find({}).lean() : Promise.resolve([]),
    showRooms
      ? Reservation.find({ createdAt: { $gte: startOf30Days } })
          .populate('room', 'name roomNumber type pricePerNight')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
      : Promise.resolve([]),
    showFood ? Order.find({}).lean() : Promise.resolve([]),
    showFood
      ? Order.find({ status: { $in: ['pending', 'accepted', 'preparing'] } })
          .populate('room', 'roomNumber')
          .sort({ placedAt: -1 })
          .lean()
      : Promise.resolve([]),
    showSpa ? SpaBooking.find({ createdAt: { $gte: startOf30Days } }).lean() : Promise.resolve([]),
    (showRooms || isSuperAdmin) ? Bill.find({ status: 'paid' }).lean() : Promise.resolve([]),
  ]);

  // ── KPI Stats ─────────────────────────────────────────────────────────────
  const checkedIn  = allReservations.filter(r => r.status === 'checked_in').length;
  const pending    = allReservations.filter(r => r.status === 'pending').length;
  const confirmed  = allReservations.filter(r => r.status === 'confirmed').length;
  const checkedOut = allReservations.filter(r => r.status === 'checked_out').length;

  const totalRevenue = paidBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const occupancyRate = totalRooms > 0 ? Math.round((checkedIn / totalRooms) * 100) : 0;

  // ── Reservations last 30 days (daily) ─────────────────────────────────────
  const reservationsByDay: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOf30Days);
    d.setDate(d.getDate() + i);
    reservationsByDay[d.toISOString().split('T')[0]] = 0;
  }
  allReservations
    .filter(r => new Date(r.createdAt as Date) >= startOf30Days)
    .forEach(r => {
      const key = new Date(r.createdAt as Date).toISOString().split('T')[0];
      if (reservationsByDay[key] !== undefined) reservationsByDay[key]++;
    });

  const reservationsTrend = Object.entries(reservationsByDay).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    reservations: count,
  }));

  // ── Revenue last 7 days ────────────────────────────────────────────────────
  const revenueByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOf7Days);
    d.setDate(d.getDate() + i);
    revenueByDay[d.toISOString().split('T')[0]] = 0;
  }
  paidBills.forEach(b => {
    const key = new Date((b.paidAt || (b as any).updatedAt || new Date()) as Date).toISOString().split('T')[0];
    if (revenueByDay[key] !== undefined) revenueByDay[key] += b.grandTotal || 0;
  });

  const revenueTrend = Object.entries(revenueByDay).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: Math.round(revenue),
  }));

  // ── Reservation status breakdown (pie) ────────────────────────────────────
  const statusBreakdown = [
    { name: 'Checked In',  value: checkedIn,  color: 'hsl(142 50% 45%)' },
    { name: 'Confirmed',   value: confirmed,  color: 'hsl(210 70% 50%)' },
    { name: 'Pending',     value: pending,    color: 'hsl(43 72% 55%)' },
    { name: 'Checked Out', value: checkedOut, color: 'hsl(220 15% 55%)' },
  ].filter(s => s.value > 0);

  // ── Room type revenue ─────────────────────────────────────────────────────
  const roomTypeMap: Record<string, { revenue: number; count: number }> = {
    royal: { revenue: 0, count: 0 },
    suite: { revenue: 0, count: 0 },
    deluxe: { revenue: 0, count: 0 },
    standard: { revenue: 0, count: 0 },
  };
  allReservations.forEach(r => {
    const room = (r as any).room;
    if (room && room.type && roomTypeMap[room.type]) {
      roomTypeMap[room.type].revenue += r.roomCharges || 0;
      roomTypeMap[room.type].count++;
    }
  });

  const roomTypeRevenue = Object.entries(roomTypeMap).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    revenue: Math.round(data.revenue),
    bookings: data.count,
  }));

  // ── Orders by category ────────────────────────────────────────────────────
  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  const orderStats = {
    total: allOrders.length,
    delivered: deliveredOrders.length,
    pending: allOrders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.status)).length,
    totalRevenue: deliveredOrders.reduce((s, o) => s + o.totalAmount, 0),
  };

  // ── Spa stats ─────────────────────────────────────────────────────────────
  const completedSpa = spaBookings.filter(b => b.status === 'completed');
  const spaStats = {
    total: spaBookings.length,
    confirmed: spaBookings.filter(b => b.status === 'confirmed').length,
    completed: completedSpa.length,
    revenue: completedSpa.reduce((s, b) => s + b.price, 0),
  };

  // ── Revenue by section ────────────────────────────────────────────────────
  const roomRevenue   = Math.round(paidBills.reduce((s, b) => {
    const roomItems = (b.lineItems || []).filter((l: any) => l.type === 'room_charge');
    return s + roomItems.reduce((a: number, l: any) => a + (l.amount || 0), 0);
  }, 0));
  const foodRevenue   = Math.round(orderStats.totalRevenue);
  const spaRevenue    = Math.round(spaStats.revenue);
  const otherRevenue  = Math.round(totalRevenue) - roomRevenue - foodRevenue - spaRevenue;

  const revenueBySection = [
    { section: 'Rooms',      revenue: roomRevenue,              color: 'hsl(43 72% 55%)' },
    { section: 'Food & Bar', revenue: Math.max(0, foodRevenue), color: 'hsl(195 60% 42%)' },
    { section: 'Spa',        revenue: Math.max(0, spaRevenue),  color: 'hsl(270 50% 52%)' },
    { section: 'Other',      revenue: Math.max(0, otherRevenue),color: 'hsl(220 15% 55%)' },
  ].filter(s => s.revenue > 0);

  res.json({
    department,
    isSuperAdmin,
    scope: { showRooms, showFood, showSpa },
    kpis: {
      totalRooms,
      availableRooms,
      occupancyRate,
      checkedIn,
      pending,
      confirmed,
      totalRevenue: Math.round(totalRevenue),
      pendingOrders: pendingOrders.length,
      totalReservations: allReservations.length,
    },
    charts: {
      reservationsTrend,
      revenueTrend,
      statusBreakdown,
      roomTypeRevenue,
      revenueBySection,
    },
    recent: {
      reservations: recentReservations,
      orders: pendingOrders.slice(0, 5),
    },
    orderStats,
    spaStats,
  });
}
