/**
 * Xóa sự kiện mẫu "Workshop: AI và Machine Learning" khỏi DB (không xóa toàn bộ seed).
 * Chạy: node scripts/deleteWorkshopEvent.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Event from '../models/Event.model.js';
import Notification from '../models/Notification.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const TITLE = 'Workshop: AI và Machine Learning';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const ev = await Event.findOne({ title: TITLE });
  if (!ev) {
    console.log('Không tìm thấy sự kiện có tiêu đề:', TITLE);
    await mongoose.disconnect();
    process.exit(0);
  }
  const id = ev._id;
  const n = await Notification.deleteMany({ event: id });
  await Event.deleteOne({ _id: id });
  console.log('Đã xóa sự kiện:', TITLE);
  console.log('Đã xóa thông báo liên quan:', n.deletedCount);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
