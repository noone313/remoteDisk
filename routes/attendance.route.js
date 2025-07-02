import express from 'express';
import {
  checkIn,
  checkOut,
  getAttendance,
  getAllAttendance,
  getAttendanceByDate,
  getAllAttendanceByOffice
} from '../controllers/attendance.controller.js';

const attendanceRouter = express.Router();

attendanceRouter.post('/check-in/:userId',  checkIn);
attendanceRouter.post('/check-out/:userId', checkOut);
attendanceRouter.get ('/user/:userId',      getAttendance);
attendanceRouter.get ('/user/:userId/by-date', getAttendanceByDate);  
attendanceRouter.get ('/office/:officeId', getAllAttendanceByOffice);  
attendanceRouter.get ('/',                  getAllAttendance);


export default attendanceRouter;
