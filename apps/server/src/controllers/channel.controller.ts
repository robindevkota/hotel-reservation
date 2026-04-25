import { Request, Response } from 'express';
import ChannelConfig from '../models/ChannelConfig';
import { syncChannel, syncAllChannels, generateICalFeed } from '../services/ical.service';

export async function listChannels(_req: Request, res: Response) {
  const channels = await ChannelConfig.find().sort({ source: 1 });
  res.json({ success: true, channels });
}

export async function upsertChannel(req: Request, res: Response) {
  const { source, label, icalUrl, isActive } = req.body;

  if (!source || !label || !icalUrl) {
    return res.status(400).json({ success: false, message: 'source, label and icalUrl are required' });
  }

  const channel = await ChannelConfig.findOneAndUpdate(
    { source },
    { label, icalUrl, isActive: isActive !== false },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, channel });
}

export async function deleteChannel(req: Request, res: Response) {
  await ChannelConfig.findOneAndDelete({ source: req.params.source });
  res.json({ success: true });
}

export async function triggerSync(req: Request, res: Response) {
  const { source } = req.params;

  if (source === 'all') {
    await syncAllChannels();
    return res.json({ success: true, message: 'All channels synced' });
  }

  const channel = await ChannelConfig.findOne({ source, isActive: true });
  if (!channel) return res.status(404).json({ success: false, message: 'Channel not found or inactive' });

  await syncChannel(channel);
  const updated = await ChannelConfig.findById(channel._id);
  res.json({ success: true, channel: updated });
}

export async function exportICal(_req: Request, res: Response) {
  const feed = await generateICalFeed();
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="royal-suites.ics"');
  res.send(feed);
}
