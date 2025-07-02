import {getAllOffices,
    getOfficeById,
    createOffice,
    updateOfficeById,
    deleteOfficeById,
    getOfficeUsers
} from '../controllers/office.controller.js';
import express from 'express';

const router = express.Router();


// Define the routes for office operations
router.get('/', getAllOffices); // Get all offices
router.get('/:id', getOfficeById); // Get office by ID
router.post('/', createOffice); // Create a new office
router.put('/:id', updateOfficeById); // Update office by ID
router.delete('/:id', deleteOfficeById); // Delete office by ID
router.get('/:id/users', getOfficeUsers); // Get users by office ID

// Export the router to be used in the main application
export default router;