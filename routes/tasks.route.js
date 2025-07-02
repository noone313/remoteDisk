import express from 'express';
import { createTask,getAllTasks,getTaskById,getTasksByStatus,getTasksByUser,getTasksByOffice,deleteTask,updateTask } from '../controllers/tasks.controller.js';

const tasksRouter = express.Router();

tasksRouter.post('/', createTask);
tasksRouter.get('/', getAllTasks);
tasksRouter.get('/:id', getTaskById);
tasksRouter.get('/status/:status', getTasksByStatus);
tasksRouter.get('/user/:userId', getTasksByUser);
tasksRouter.get('/office/:id', getTasksByOffice);
tasksRouter.delete('/:id', deleteTask);
tasksRouter.put('/:id', updateTask);


export default tasksRouter;
