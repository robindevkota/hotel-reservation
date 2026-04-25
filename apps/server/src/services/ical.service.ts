import https from 'https';
import http from 'http';
import Reservation from '../models/Reservation';
import ChannelConfig, { IChannelConfig } from '../models/ChannelConfig';

// ── Minimal iCal parser ───────────────────────────────────────────────────────

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: Date | null;
  dtend: Date | null;
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseDate(raw: string): Date | null {
  // Handles VALUE=DATE:20260415 and 20260415T120000Z
  const clean = raw.replace(/.*:/, '').trim();
  if (clean.length === 8) {
    // DATE only — YYYYMMDD
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`);
  }
  // YYYYMMDDTHHMMSSZ
  return new Date(
    `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}Z`
  );
}

function parseICal(text: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = text.replace(/\r\n /g, '').replace(/\r\n/g, '\n').split('\n');

  let current: Partial<ICalEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      if (current.uid && current.dtstart && current.dtend) {
        events.push(current as ICalEvent);
      }
      current = null;
    } else if (current) {
      if (line.startsWith('UID:')) current.uid = line.slice(4).trim();
      else if (line.startsWith('SUMMARY:')) current.summary = line.slice(8).trim();
      else if (line.startsWith('DTSTART')) current.dtstart = parseDate(line);
      else if (line.startsWith('DTEND'))   current.dtend   = parseDate(line);
    }
  }

  return events;
}

// ── Sync one channel ──────────────────────────────────────────────────────────

export async function syncChannel(channel: IChannelConfig): Promise<void> {
  const text = await fetchText(channel.icalUrl);
  const events = parseICal(text);

  for (const ev of events) {
    if (!ev.dtstart || !ev.dtend) continue;

    // Use the iCal UID as the bookingRef so we never duplicate
    const bookingRef = `${channel.source.toUpperCase()}-${ev.uid.slice(0, 24)}`;

    const exists = await Reservation.findOne({ bookingRef });
    if (exists) continue;

    await Reservation.create({
      bookingRef,
      source: channel.source,
      status: 'confirmed',
      guest: {
        name:    ev.summary || 'OTA Guest',
        email:   `ota-${Date.now()}@placeholder.local`,
        phone:   'N/A',
        idProof: '',
      },
      checkInDate:    ev.dtstart,
      checkOutDate:   ev.dtend,
      numberOfGuests: 1,
      totalNights:    Math.max(1, Math.round((ev.dtend.getTime() - ev.dtstart.getTime()) / 86400000)),
      roomCharges:    0,
      specialRequests: `Imported from ${channel.label}. Assign room and update guest details manually.`,
      cancellationPolicy: 'flexible',
    });
  }

  await ChannelConfig.findByIdAndUpdate(channel._id, {
    lastSyncedAt: new Date(),
    lastSyncError: '',
  });
}

export async function syncAllChannels(): Promise<void> {
  const channels = await ChannelConfig.find({ isActive: true });
  for (const ch of channels) {
    try {
      await syncChannel(ch);
    } catch (err: any) {
      await ChannelConfig.findByIdAndUpdate(ch._id, {
        lastSyncError: err.message || 'Unknown error',
      });
    }
  }
}

// ── iCal export (Royal Suites → OTAs) ────────────────────────────────────────

export async function generateICalFeed(): Promise<string> {
  const reservations = await Reservation.find({
    source: 'website',
    status: { $in: ['confirmed', 'checked_in'] },
    checkOutDate: { $gte: new Date() },
  }).populate('room', 'name');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Royal Suites//Channel Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const r of reservations) {
    const room = (r.room as any);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${r.bookingRef}@royalsuites`);
    lines.push(`DTSTART:${fmt(r.checkInDate)}`);
    lines.push(`DTEND:${fmt(r.checkOutDate)}`);
    lines.push(`SUMMARY:BLOCKED - ${room?.name || 'Room'}`);
    lines.push(`DESCRIPTION:Ref: ${r.bookingRef}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
