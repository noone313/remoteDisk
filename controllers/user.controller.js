import { User,Office } from '../models/models.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import redisClient from '../redis.client.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, password, officeId } = req.body;

    // التحقق من وجود المستخدم بالفعل
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // التحقق من صحة كلمة المرور
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // التحقق من وجود المكتب
    if (!officeId) {
      return res.status(400).json({ message: 'Office ID is required' });
    }

    // التحقق من وجود المكتب في قاعدة البيانات
    const officeExists = await Office.findOne({ where: { id: officeId } });
    if (!officeExists) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // إنشاء المستخدم الجديد
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      officeId
    });

    // إزالة كلمة المرور من الاستجابة
    newUser.password = undefined;

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // التحقق من وجود المستخدم
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // التحقق من صحة كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // إنشاء توكن JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: '500h' }
    );

    // تعيين الكوكيز
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000 * 500, // 500 ساعة
    });

    // إرجاع معلومات المستخدم بدون كلمة المرور
    const { password: _, ...userData } = user.toJSON();
    res.status(200).json({ ...userData, token });

  } catch (error) {
    console.error('❌ Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const cacheKey = `user:${userId}`;

    // جلب من الكاش أولاً
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      console.log(`✅ Returning cached user profile for user ${userId}`);
      return res.status(200).json(JSON.parse(cachedUser));
    }

    // إذا ما كان في الكاش، جلب من قاعدة البيانات
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userData } = user.toJSON();

    // تخزين البيانات في الكاش مع مدة صلاحية (مثلاً 300 ثانية)
    await redisClient.setEx(cacheKey, 300, JSON.stringify(userData));

    res.status(200).json(userData);

  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is stored in req.user after authentication

    // التحقق من وجود المستخدم
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // حذف المستخدم
    await user.destroy();
 // مسح الكاش بعد التعديل
    await redisClient.del(`user:${userId}`);
    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const logoutUser = (req, res) => {
  try {
    // حذف الكوكيز
    res.clearCookie('token');
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    console.error('❌ Error logging out user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      console.log(`✅ Returning cached user by ID ${userId}`);
      return res.status(200).json(JSON.parse(cachedUser));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userData } = user.toJSON();

    await redisClient.setEx(cacheKey, 300, JSON.stringify(userData));

    res.status(200).json(userData);

  } catch (error) {
    console.error('❌ Error fetching user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const updateUserById = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is stored in req.user after authentication
    const { name, email } = req.body;

    // التحقق من وجود المستخدم
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // تحديث معلومات المستخدم
    user.name = name || user.name;
    user.email = email || user.email;

    await user.save();

    // إرجاع معلومات المستخدم المحدثة بدون كلمة المرور
    const { password: _, ...userData } = user.toJSON();
     // مسح الكاش بعد التعديل
    await redisClient.del(`user:${userId}`);
    res.status(200).json(userData);

  } catch (error) {
    console.error('❌ Error updating user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // التحقق من وجود المستخدم
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // حذف المستخدم
    await user.destroy();

    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const changeUserPassword = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is stored in req.user after authentication
    const { oldPassword, newPassword } = req.body;

    // التحقق من وجود المستخدم
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // التحقق من صحة كلمة المرور القديمة
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(401).json({ message: 'Invalid old password' });
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // تحديث كلمة المرور
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ Error changing user password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
