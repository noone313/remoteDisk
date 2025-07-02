import express from 'express';
import {
  createUser,
  loginUser,
  logoutUser,
  updateUserById,
  deleteUserById,
  getUserProfile,
  changeUserPassword,
  deleteUser,
  getUserById
} from '../controllers/user.controller.js';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../redis.client.js';


const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // فقط 5 محاولات تسجيل دخول لكل IP خلال 15 دقيقة
  message: 'Too many login attempts, please try again after 15 minutes.',
});




const userRouter = express.Router();

userRouter.post('/create', createUser);
userRouter.post('/login',loginLimiter, loginUser);
userRouter.post('/logout', logoutUser);


userRouter.get('/profile', getUserProfile);
userRouter.put('/profile/update/:id', updateUserById);
userRouter.delete('/delete-by-id/:id', deleteUserById);
userRouter.put('/change-password', changeUserPassword);
userRouter.delete('/delete', deleteUser);
userRouter.get('/:id', getUserById);


userRouter.put('/:id', updateUserById);

export default userRouter;
