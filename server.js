import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { startServer } from './models/models.js';
import userRouter from './routes/user.route.js';
import officeRouter from './routes/office.route.js';
import tasksRouter from './routes/tasks.route.js'; 
import attendanceRouter from './routes/attendance.route.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import redisClient from './redis.client.js';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import morgan from 'morgan';
import logger from './logger.js';


config(); // تحميل متغيرات البيئة

const app = express();
const server = http.createServer(app); // ⬅️ إنشاء السيرفر من app
const io = new Server(server, {
  cors: {
    origin: '*', 
  }
});

// إعداد limiter عام (مثال: 100 طلب لكل IP كل 15 دقيقة)
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى للطلبات في فترة النافذة
  standardHeaders: true, // إرسال معلومات الحدود في هيدر الرد
  legacyHeaders: false, // عدم إرسال هيدرات قديمة
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});



// تطبيق الـ rate limiter على كل الطلبات
app.use(limiter);

app.set('io', io);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// استخدم morgan لتسجيل طلبات HTTP، وأرسلها للـ winston
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// الراوترات
app.use('/api/v1/users', userRouter);
app.use('/api/v1/offices', officeRouter);
app.use('/api/v1/tasks', tasksRouter); 
app.use('/api/v1/attendance', attendanceRouter);

app.get('/', (req, res) => {
  res.send('🚀 WebSocket API is running');
});

async function start() {
  const pubClient = createClient({ url: process.env.REDIS_URL || '' });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('join-office', (officeId) => {
      if (officeId) {
        const roomName = `office-${officeId}`;
        socket.join(roomName);
        console.log(`🏢 Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on('join', (userId) => {
      socket.join(userId.toString());
      console.log(`👤 User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });

  await startServer();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 Server listening on http://localhost:${PORT}`);
  });
}

start().catch(console.error);

                                                                                              