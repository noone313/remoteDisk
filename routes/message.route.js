import {
    createMessage,
    getMessagesByOffice,
    deleteMessage,
    updateMessage,
} from '../controllers/message.controller.js'
import {authenticateToken} from '../middlewares/auth.js'; 

import express from 'express';

const messageRouter = express.Router();

messageRouter.post('/',authenticateToken, createMessage); // إنشاء رسالة جديدة
messageRouter.get('/:officeId', getMessagesByOffice); // الحصول على الرسائل لمكتب معين
messageRouter.delete('/:id', deleteMessage); // حذف رسالة
messageRouter.put('/:id', updateMessage); // تحديث رسالة

export default messageRouter; // تصدير الراوتر