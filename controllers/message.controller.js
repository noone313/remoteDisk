import { Message, User } from "../models/models.js"; 
import redisClient from '../redis.client.js';  

export const createMessage = async (req, res) => {
    try {
        const { content, officeId } = req.body;
    
        if (!content || !officeId) {
            return res.status(400).json({ message: "Content and officeId are required" });
        }
    
        const newMessage = await Message.create({
            content,
            officeId,
            userId: req.user.id
        });
    
        // Emit the new message to the office room
        const io = req.app.get('io');
        io.to(`office-${officeId}`).emit('new-message', newMessage);

        // مسح الكاش الخاص بهذا المكتب
        await redisClient.del(`messages:office:${officeId}`);

        return res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error creating message:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMessagesByOffice = async (req, res) => {
    try {
        const { officeId } = req.params;
    
        if (!officeId) {
            return res.status(400).json({ message: "officeId is required" });
        }

        const cacheKey = `messages:office:${officeId}`;
        const cachedMessages = await redisClient.get(cacheKey);
        if (cachedMessages) {
            console.log(`✅ Returning cached messages for office ${officeId}`);
            return res.status(200).json(JSON.parse(cachedMessages));
        }
    
        const messages = await Message.findAll({
            where: { officeId },
            include: [{ model: User, attributes: ['id', 'name'] }]
        });

        await redisClient.setEx(cacheKey, 60, JSON.stringify(messages)); // حفظ الكاش لمدة 60 ثانية
    
        return res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
    
        const message = await Message.findByPk(id);
    
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
    
        if (message.userId !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to delete this message" });
        }
    
        await message.destroy();
    
        const io = req.app.get('io');
        io.to(`office-${message.officeId}`).emit('message-deleted', { id });

        // مسح الكاش الخاص بهذا المكتب
        await redisClient.del(`messages:office:${message.officeId}`);

        return res.status(204).send();
    } catch (error) {
        console.error("Error deleting message:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
    
        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }
    
        const message = await Message.findByPk(id);
    
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
    
        if (message.userId !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to update this message" });
        }
    
        message.content = content;
        await message.save();
    
        const io = req.app.get('io');
        io.to(`office-${message.officeId}`).emit('message-updated', message);

        // مسح الكاش الخاص بهذا المكتب
        await redisClient.del(`messages:office:${message.officeId}`);

        return res.status(200).json(message);
    } catch (error) {
        console.error("Error updating message:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
