import { Office, User } from '../models/models.js';

export const getAllOffices = async (req, res) => {
  try {
    const offices = await Office.findAll();
    res.status(200).json(offices);
  } catch (error) {
    console.error('❌ Error fetching offices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getOfficeById = async (req, res) => {
  try {
    const officeId = req.params.id;
    const office = await Office.findByPk(officeId);
    
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }
    
    res.status(200).json(office);
  } catch (error) {
    console.error('❌ Error fetching office by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const createOffice = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name ) {
      return res.status(400).json({ message: 'Name id required' });
    }
    
    const newOffice = await Office.create({ name });
    res.status(201).json(newOffice);
  } catch (error) {
    console.error('❌ Error creating office:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const updateOfficeById = async (req, res) => {
  try {
    const officeId = req.params.id;
    const { name } = req.body;
    
    const office = await Office.findByPk(officeId);
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }
    
    office.name = name || office.name;
    
    
    await office.save();
    res.status(200).json(office);
  } catch (error) {
    console.error('❌ Error updating office:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const deleteOfficeById = async (req, res) => {
  try {
    const officeId = req.params.id;
    
    const office = await Office.findByPk(officeId);
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }
    
    await office.destroy();
    res.status(204).send(); // No content
  } catch (error) {
    console.error('❌ Error deleting office:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getOfficeUsers = async (req, res) => {
  try {
    const officeId = req.params.id;
    const office = await Office.findByPk(officeId, {
      include: [{ model: User, as: 'users' }]
    });
    
    if (!office) {
      return res.status(404).json({ message: 'Office not found' });
    }
    
    res.status(200).json(office.users);
  } catch (error) {
    console.error('❌ Error fetching office users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

