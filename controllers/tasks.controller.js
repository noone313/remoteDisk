import { Task, User, Office } from '../models/models.js';
import redisClient from '../redis.client.js';

export const createTask = async (req, res) => {
  try {
    const { title, description, status, officeId, assigned_to, created_by } = req.body;

    if (!title || !officeId || !assigned_to || !created_by) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const office = await Office.findByPk(officeId);
    if (!office) return res.status(404).json({ message: 'Office not found' });

    const assignedUser = await User.findByPk(assigned_to);
    const creatorUser = await User.findByPk(created_by);
    if (!assignedUser || !creatorUser) {
      return res.status(404).json({ message: 'Assigned user or creator not found' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'pending',
      officeId,
      assigned_to,
      created_by
    });

    // إرسال المهمة عبر WebSocket
    const io = req.app.get('io');
    if (!io) {
      console.error('❌ Socket.io not initialized');
        return res.status(500).json({ message: 'Socket.io not initialized' });
    }
    io.to(assigned_to.toString()).emit('taskCreated', {
  message: '📌 لديك مهمة جديدة!',
  task,
});

io.to(`office-${officeId}`).emit('new-task', task);

await redisClient.del('tasks:all');
await redisClient.del(`tasks:office:${officeId}`);

    res.status(201).json(task);
  } catch (error) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllTasks = async (req, res) => {
  try {
    const cacheKey = 'tasks:all';

    //  محاولة جلب البيانات من Redis
    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      console.log('✅ Returning cached tasks');
      return res.status(200).json(JSON.parse(cachedTasks));
    }

    const tasks = await Task.findAll({
      include: [
        { model: User, as: 'assignedTo' },
        { model: User, as: 'createdBy' },
        { model: Office }
      ]
    });

    //  حفظ البيانات في Redis مع مدة صلاحية (60 ثانية)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(tasks));

    res.status(200).json(tasks);
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'assignedTo' },
        { model: User, as: 'createdBy' },
        { model: Office }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('❌ Error fetching task by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const { title, description, status } = req.body;

        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // تحديث المهمة
        task.title = title || task.title;
        task.description = description || task.description;
        task.status = status || task.status;

        await task.save();

        // إرسال التحديث عبر WebSocket
        const io = req.app.get('io');
        if (!io) {
            console.error('❌ Socket.io not initialized');
            return res.status(500).json({ message: 'Socket.io not initialized' });
        }
        io.to(task.assigned_to.toString()).emit('taskUpdated', {
            message: '🔄 تم تحديث مهمة',
            task
        });
        io.to(`office-${task.officeId}`).emit('taskUpdated', task);
        await redisClient.del('tasks:all');
        await redisClient.del(`tasks:office:${task.officeId}`);
        res.status(200).json(task);
        
    } catch (error) {
        console.error('❌ Error updating task:', error);
        res.status(500).json({ message: 'Internal server error' });
        
    }
}

export const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.destroy();

    // إرسال إشعار الحذف عبر WebSocket
    const io = req.app.get('io');
    if (!io) {
      console.error('❌ Socket.io not initialized');
      return res.status(500).json({ message: 'Socket.io not initialized' });
    }
    io.to(task.assigned_to.toString()).emit('taskDeleted', {
      message: '🗑️ تم حذف مهمة',
      taskId
    });
    io.to(`office-${task.officeId}`).emit('taskDeleted', { taskId });
await redisClient.del('tasks:all');
await redisClient.del(`tasks:office:${task.officeId}`);


res.status(200).json({ message: 'Task deleted', taskId });
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTasksByOffice = async (req, res) => {
  try {
    const officeId = req.params.id;
    const cacheKey = `tasks:office:${officeId}`;

    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      console.log(`✅ Returning cached tasks for office ${officeId}`);
      return res.status(200).json(JSON.parse(cachedTasks));
    }

    const tasks = await Task.findAll({
      where: { officeId },
      include: [
        { model: User, as: 'assignedTo' },
        { model: User, as: 'createdBy' }
      ]
    });

    if (!tasks.length) {
      return res.status(404).json({ message: 'No tasks found for this office' });
    }

    await redisClient.setEx(cacheKey, 60, JSON.stringify(tasks));
    res.status(200).json(tasks);
  } catch (error) {
    console.error('❌ Error fetching tasks by office:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getTasksByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const tasks = await Task.findAll({
      where: { assigned_to: userId },
      include: [
        { model: User, as: 'assignedTo' },
        { model: User, as: 'createdBy' },
        { model: Office }
      ]
    });

    if (!tasks.length) {
      return res.status(404).json({ message: 'No tasks found for this user' });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('❌ Error fetching tasks by user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTasksByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) {
      return res.status(400).json({ message: 'Status query parameter is required' });
    }

    const tasks = await Task.findAll({
      where: { status },
      include: [
        { model: User, as: 'assignedTo' },
        { model: User, as: 'createdBy' },
        { model: Office }
      ]
    });

    if (!tasks.length) {
      return res.status(404).json({ message: 'No tasks found with this status' });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('❌ Error fetching tasks by status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};