import { Attendance, User } from '../models/models.js';

// 🟢 تسجيل الحضور
export const checkIn = async (req, res) => {
  const { userId } = req.params;
  const today = new Date().toISOString().slice(0, 10);      // 'YYYY-MM-DD'

  try {
    // منع تكرار الحضور لليوم نفسه
    const already = await Attendance.findOne({ where: { userId, date: today } });
    if (already) return res.status(400).json({ message: 'Already checked‑in today' });

    const record = await Attendance.create({
      userId,
      date: today,
      check_in: new Date().toTimeString().slice(0, 8)        // 'HH:MM:SS'
    });

    // إرسال إشعار Socket.IO
    const io = req.app.get('io');
    io?.to(userId.toString()).emit('attendanceCheckIn', record);

    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🔴 تسجيل الانصراف
export const checkOut = async (req, res) => {
  const { userId } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const record = await Attendance.findOne({ where: { userId, date: today } });
    if (!record) return res.status(404).json({ message: 'No check‑in found today' });
    if (record.check_out) return res.status(400).json({ message: 'Already checked‑out' });

    record.check_out = new Date().toTimeString().slice(0, 8);
    await record.save();

    const io = req.app.get('io');
    io?.to(userId.toString()).emit('attendanceCheckOut', record);

    res.status(200).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🗂️ سجلات مستخدم
export const getAttendance = async (req, res) => {
  const { userId } = req.params;
  const records = await Attendance.findAll({
    where: { userId },
    order: [['date', 'DESC']]
  });
  res.status(records.length ? 200 : 404).json(records);
};

// 🗂️ كل السجلات
export const getAllAttendance = async (_, res) => {
  const records = await Attendance.findAll({ include: User, order: [['date', 'DESC']] });
  res.status(records.length ? 200 : 404).json(records);
};

// 🔍 حسب التاريخ
export const getAttendanceByDate = async (req, res) => {
  const { userId } = req.params;
  const { date } = req.body;                // Expect 'YYYY-MM-DD'
  if (!date) return res.status(400).json({ message: 'date in body is required' });

  const records = await Attendance.findAll({ where: { userId, date } });
  res.status(records.length ? 200 : 404).json(records);
};

// 🏢 كل سجلات المكتب
export const getAllAttendanceByOffice = async (req, res) => {
    const { officeId } = req.params;
    if (!officeId) return res.status(400).json({ message: 'officeId is required' });
    
    const records = await Attendance.findAll({
        include: [{ model: User, where: { officeId } }],
        order: [['date', 'DESC']]
    });
    
    res.status(records.length ? 200 : 404).json(records);
    };