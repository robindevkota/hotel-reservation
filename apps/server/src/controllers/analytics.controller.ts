import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Reservation from '../models/Reservation';
import Order from '../models/Order';
import SpaBooking from '../models/SpaBooking';
import Room from '../models/Room';
import Bill from '../models/Bill';
import StockLog from '../models/StockLog';
import { getUsdToNprRate } from '../services/exchangeRate.service';

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
    // Cash orders delivered in last 7 days
    cashOrdersLast7,
    // Cash spa completed in last 7 days
    cashSpaLast7,
    // Petty cash purchase logs (superadmin only)
    pettyCashLogs,
    // All delivered orders for audit (superadmin only)
    allDeliveredOrders,
    // All completed spa for audit (superadmin only)
    allCompletedSpaFull,
    exchangeRate,
  ] = await Promise.all([
    showRooms ? Room.countDocuments({}) : Promise.resolve(0),
    showRooms ? Room.countDocuments({ isAvailable: true }) : Promise.resolve(0),
    showRooms ? Reservation.find({}).populate('room', 'type pricePerNight').lean() : Promise.resolve([]),
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
          .populate('walkInCustomer', 'name type')
          .sort({ placedAt: -1 })
          .lean()
      : Promise.resolve([]),
    showSpa ? SpaBooking.find({ createdAt: { $gte: startOf30Days } }).lean() : Promise.resolve([]),
    (showRooms || isSuperAdmin)
      ? Bill.find({ status: { $in: ['paid', 'pending_payment'] } })
          .populate({ path: 'guest', select: 'name email nationality reservation', populate: { path: 'reservation', select: 'bookingRef guestType' } })
          .lean()
      : Promise.resolve([]),
    // Cash orders (hotel guest cash + walk-in) delivered in last 7 days
    showFood
      ? Order.find({
          orderPaymentMethod: 'cash',
          status: 'delivered',
          deliveredAt: { $gte: startOf7Days },
        }).lean()
      : Promise.resolve([]),
    // Cash spa completed in last 7 days
    showSpa
      ? SpaBooking.find({
          spaPaymentMethod: 'cash',
          status: 'completed',
          updatedAt: { $gte: startOf7Days },
        }).lean()
      : Promise.resolve([]),
    // All petty cash purchase logs (operational expenses)
    isSuperAdmin
      ? StockLog.find({ type: 'petty_cash_purchase' }).lean()
      : Promise.resolve([]),
    // All delivered orders for audit (superadmin only)
    isSuperAdmin
      ? Order.find({ status: 'delivered' })
          .populate('room', 'roomNumber')
          .populate('walkInCustomer', 'name type nationality')
          .sort({ deliveredAt: -1 })
          .lean()
      : Promise.resolve([]),
    // All completed spa for audit (superadmin only)
    isSuperAdmin
      ? SpaBooking.find({ status: 'completed' })
          .populate('guest', 'name nationality')
          .populate('walkInCustomer', 'name nationality')
          .populate('service', 'name')
          .sort({ updatedAt: -1 })
          .lean()
      : Promise.resolve([]),
    getUsdToNprRate(),
  ]);

  // ── KPI Stats ─────────────────────────────────────────────────────────────
  // Use actual room availability for occupancy — reservation status counts are unreliable
  // (future-dated checked_in reservations inflate the count)
  const occupiedRooms = totalRooms - availableRooms;
  const checkedIn  = occupiedRooms;
  const pending    = allReservations.filter(r => r.status === 'pending').length;
  const confirmed  = allReservations.filter(r => r.status === 'confirmed').length;
  const checkedOut = allReservations.filter(r => r.status === 'checked_out').length;

  // Room-bill revenue = paid bills (covers room + room_bill food/spa)
  const billRevenue = paidBills.reduce((s, b) => s + (b.grandTotal || 0), 0);

  // Cash revenue = delivered cash orders + completed cash spa (not on any bill)
  const allDeliveredCashOrders = allOrders.filter(
    o => o.status === 'delivered' && o.orderPaymentMethod === 'cash'
  );
  const allCompletedCashSpa = spaBookings.filter(
    b => b.status === 'completed' && (b as any).spaPaymentMethod === 'cash'
  );
  const cashOrderRevenue = allDeliveredCashOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const cashSpaRevenue   = allCompletedCashSpa.reduce((s, b) => s + (b.price || 0), 0);

  const totalPettyCash = (pettyCashLogs as any[]).reduce((s, l) => s + (l.cashAmount || 0), 0);
  const totalRevenue = billRevenue + cashOrderRevenue + cashSpaRevenue;
  const netRevenue = Math.max(0, totalRevenue - totalPettyCash);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // ── NPR conversion ─────────────────────────────────────────────────────────
  const toNpr = (usd: number) => Math.round(usd * exchangeRate);

  // ── Audit log (superadmin only) ───────────────────────────────────────────
  let audit: any = null;
  if (isSuperAdmin) {
    // Bill-based transactions (room stays with food/spa on room bill)
    const billTransactions = paidBills.map((b: any) => {
      const guest = b.guest ?? {};
      const isNepali = guest.nationality === 'nepali';
      // Use rate stored at time of payment if available, else current rate
      const billRate = b.exchangeRateAtPayment ?? exchangeRate;
      const toNprBill = (usd: number) => Math.round(usd * billRate);
      return {
        type: 'bill',
        billId: b._id,
        status: b.status,
        paymentMethod: b.paymentMethod ?? 'pending',
        guestName: guest.name ?? '—',
        guestEmail: guest.email ?? '—',
        nationality: guest.nationality ?? 'foreign',
        isNepali,
        bookingRef: guest.reservation?.bookingRef ?? '—',
        sections: {
          room:  Math.round((b.roomCharges  || 0) * 100) / 100,
          food:  Math.round((b.foodCharges  || 0) * 100) / 100,
          spa:   Math.round((b.spaCharges   || 0) * 100) / 100,
          other: Math.round((b.otherCharges || 0) * 100) / 100,
        },
        grandTotal:    Math.round((b.grandTotal || 0) * 100) / 100,
        grandTotalNpr: toNprBill(b.grandTotal || 0),
        vatEnabled:    b.vatEnabled ?? false,
        prepaidAmount: Math.round((b.prepaidAmount || 0) * 100) / 100,
        exchangeRate:  billRate,
        isWalkIn:      false, // bills are always in-house hotel guests
        date: b.paidAt ?? b.updatedAt,
      };
    });

    // Cash order transactions
    const orderTransactions = (allDeliveredOrders as any[]).map(o => {
      const isWalkIn = !!o.walkInCustomer;
      const customerName = isWalkIn ? (o.walkInCustomer?.name ?? '—') : (o.room?.roomNumber ? `Room ${o.room.roomNumber}` : '—');
      const nationality = o.walkInCustomer?.nationality ?? 'foreign';
      return {
        type: 'cash_order',
        orderId: o._id,
        paymentMethod: o.orderPaymentMethod,
        isWalkIn,
        customerName,
        nationality,
        section: 'food',
        amount:    Math.round((o.totalAmount || 0) * 100) / 100,
        amountNpr: toNpr(o.totalAmount || 0),
        exchangeRate,
        date: o.deliveredAt ?? o.updatedAt,
        itemCount: (o.items ?? []).length,
      };
    });

    // Cash spa transactions
    const spaTransactions = (allCompletedSpaFull as any[]).map((b: any) => {
      const isWalkIn = !!b.walkInCustomer;
      const customerName = isWalkIn ? (b.walkInCustomer?.name ?? '—') : (b.guest?.name ?? '—');
      const nationality = isWalkIn ? (b.walkInCustomer?.nationality ?? 'foreign') : (b.guest?.nationality ?? 'foreign');
      return {
        type: 'cash_spa',
        bookingId: b._id,
        paymentMethod: b.spaPaymentMethod,
        isWalkIn,
        customerName,
        nationality,
        section: 'spa',
        serviceName: b.service?.name ?? '—',
        amount:    Math.round((b.price || 0) * 100) / 100,
        amountNpr: toNpr(b.price || 0),
        exchangeRate,
        date: b.updatedAt,
      };
    });

    // Petty cash transactions
    const pettyCashTransactions = (pettyCashLogs as any[]).map((l: any) => ({
      type: 'petty_cash',
      logId: l._id,
      purchasedBy: l.purchasedBy ?? '—',
      vendor: l.vendor ?? '—',
      section: 'operational',
      amount:    Math.round((l.cashAmount || 0) * 100) / 100,
      amountNpr: toNpr(l.cashAmount || 0),
      exchangeRate,
      date: l.createdAt,
    }));

    // Summary by section
    const auditSummary = {
      billRevenue:       Math.round(billRevenue),
      billRevenueNpr:    toNpr(billRevenue),
      cashOrderRevenue:  Math.round(cashOrderRevenue),
      cashOrderRevenueNpr: toNpr(cashOrderRevenue),
      cashSpaRevenue:    Math.round(cashSpaRevenue),
      cashSpaRevenueNpr: toNpr(cashSpaRevenue),
      totalRevenue:      Math.round(totalRevenue),
      totalRevenueNpr:   toNpr(totalRevenue),
      operationalExpenses:    Math.round(totalPettyCash),
      operationalExpensesNpr: toNpr(totalPettyCash),
      netRevenue:      Math.round(netRevenue),
      netRevenueNpr:   toNpr(netRevenue),
      exchangeRate,
      billCount:   paidBills.length,
      orderCount:  (allDeliveredOrders as any[]).length,
      spaCount:    (allCompletedSpaFull as any[]).length,
      cashBillCount:  paidBills.filter((b: any) => b.paymentMethod === 'cash').length,
      stripeBillCount: paidBills.filter((b: any) => b.paymentMethod === 'stripe').length,
    };

    audit = {
      summary: auditSummary,
      bills: billTransactions,
      orders: orderTransactions,
      spa: spaTransactions,
      pettyCash: pettyCashTransactions,
    };
  }

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

  // ── Revenue last 7 days — bill payments + cash orders + cash spa ──────────
  const revenueByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOf7Days);
    d.setDate(d.getDate() + i);
    revenueByDay[d.toISOString().split('T')[0]] = 0;
  }

  // Bill revenue bucketed by paidAt (paid bills) or updatedAt (pending_payment = checked out)
  paidBills.forEach(b => {
    const ts = (b as any).paidAt || (b as any).updatedAt || new Date();
    const key = new Date(ts as Date).toISOString().split('T')[0];
    if (revenueByDay[key] !== undefined) revenueByDay[key] += b.grandTotal || 0;
  });

  // Cash orders bucketed by deliveredAt
  cashOrdersLast7.forEach((o: any) => {
    const key = new Date(o.deliveredAt).toISOString().split('T')[0];
    if (revenueByDay[key] !== undefined) revenueByDay[key] += o.totalAmount || 0;
  });

  // Cash spa bucketed by updatedAt (when completed)
  cashSpaLast7.forEach((b: any) => {
    const key = new Date(b.updatedAt).toISOString().split('T')[0];
    if (revenueByDay[key] !== undefined) revenueByDay[key] += b.price || 0;
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

  // ── Orders stats (all delivered — room_bill + cash) ───────────────────────
  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  const orderStats = {
    total: allOrders.length,
    delivered: deliveredOrders.length,
    pending: allOrders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.status)).length,
    totalRevenue: deliveredOrders.reduce((s, o) => s + o.totalAmount, 0),
    cashRevenue: allDeliveredCashOrders.reduce((s, o) => s + o.totalAmount, 0),
    walkInCount: allOrders.filter(o => (o as any).walkInCustomer).length,
  };

  // ── Spa stats (all completed — room_bill + cash) ──────────────────────────
  const completedSpa = spaBookings.filter(b => b.status === 'completed');
  const spaStats = {
    total: spaBookings.length,
    confirmed: spaBookings.filter(b => b.status === 'confirmed').length,
    completed: completedSpa.length,
    revenue: completedSpa.reduce((s, b) => s + b.price, 0),
    cashRevenue: allCompletedCashSpa.reduce((s, b) => s + b.price, 0),
    walkInCount: spaBookings.filter(b => (b as any).walkInCustomer).length,
  };

  // ── Revenue by section (all sources) ─────────────────────────────────────
  const roomRevenue = Math.round(paidBills.reduce((s, b) => {
    const roomItems = (b.lineItems || []).filter((l: any) => l.type === 'room');
    return s + roomItems.reduce((a: number, l: any) => a + (l.amount || 0), 0);
  }, 0));

  // Food = delivered orders (room_bill via bills + cash directly)
  const foodRevenue = Math.round(orderStats.totalRevenue);

  // Spa = completed bookings (room_bill via bills + cash directly)
  const spaRevenue = Math.round(spaStats.revenue);

  // Other = manual charges on paid bills (type 'other') — not double-counted
  const otherRevenue = Math.round(paidBills.reduce((s, b) => {
    const otherItems = (b.lineItems || []).filter((l: any) => l.type === 'other');
    return s + otherItems.reduce((a: number, l: any) => a + (l.amount || 0), 0);
  }, 0));

  const revenueBySection = [
    { section: 'Rooms',      revenue: roomRevenue,              color: 'hsl(43 72% 55%)' },
    { section: 'Food & Bar', revenue: Math.max(0, foodRevenue), color: 'hsl(195 60% 42%)' },
    { section: 'Spa',        revenue: Math.max(0, spaRevenue),  color: 'hsl(270 50% 52%)' },
    { section: 'Other',      revenue: Math.max(0, otherRevenue),color: 'hsl(220 15% 55%)' },
  ].filter(s => s.revenue > 0);

  // ── Walk-in vs In-house breakdown (food + spa, superadmin/scoped) ─────────
  const foodWalkIn  = allOrders.filter(o => (o as any).walkInCustomer).length;
  const foodInHouse = allOrders.length - foodWalkIn;
  const spaWalkIn   = spaBookings.filter(b => (b as any).walkInCustomer).length;
  const spaInHouse  = spaBookings.length - spaWalkIn;

  const walkInBreakdown = [
    ...(showFood ? [
      { category: 'Food — Walk-in',  count: foodWalkIn,  color: 'hsl(38 80% 45%)' },
      { category: 'Food — In-house', count: foodInHouse, color: 'hsl(195 60% 42%)' },
    ] : []),
    ...(showSpa ? [
      { category: 'Spa — Walk-in',   count: spaWalkIn,   color: 'hsl(270 50% 52%)' },
      { category: 'Spa — In-house',  count: spaInHouse,  color: 'hsl(270 70% 72%)' },
    ] : []),
  ].filter(w => w.count > 0);

  res.json({
    department,
    isSuperAdmin,
    scope: { showRooms, showFood, showSpa },
    exchangeRate,
    kpis: {
      totalRooms,
      availableRooms,
      occupancyRate,
      checkedIn,
      pending,
      confirmed,
      totalRevenue:        Math.round(totalRevenue),
      totalRevenueNpr:     toNpr(totalRevenue),
      operationalExpenses: Math.round(totalPettyCash),
      operationalExpensesNpr: toNpr(totalPettyCash),
      netRevenue:          Math.round(netRevenue),
      netRevenueNpr:       toNpr(netRevenue),
      pendingOrders: pendingOrders.length,
      totalReservations: allReservations.length,
    },
    charts: {
      reservationsTrend,
      revenueTrend,
      statusBreakdown,
      roomTypeRevenue,
      revenueBySection,
      walkInBreakdown,
    },
    recent: {
      reservations: recentReservations,
      orders: pendingOrders.slice(0, 5),
    },
    orderStats,
    spaStats,
    ...(isSuperAdmin && audit ? { audit } : {}),
  });
}
