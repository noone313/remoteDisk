import { Sequelize, DataTypes } from 'sequelize';
import { config } from 'dotenv';
config();
const sequelize = new Sequelize(process.env.DB_URI,{
  dialect: 'postgres',
  logging: false, // Disable logging for cleaner output
});

// النماذج:

// 1. Office
const Office = sequelize.define('Office', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// 2. User
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    defaultValue: 'employee',
  },
});

// 3. Attendance
const Attendance = sequelize.define('Attendance', {
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  check_in: DataTypes.TIME,
  check_out: DataTypes.TIME,
});

// 4. Task
const Task = sequelize.define('Task', {
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
});

// 5. Message
const Message = sequelize.define('Message', {
  content: DataTypes.TEXT,
});

// العلاقات:

Office.hasMany(User);
User.belongsTo(Office);

Office.hasMany(Task);
Task.belongsTo(Office);

Office.hasMany(Message);
Message.belongsTo(Office);

User.hasMany(Attendance);
Attendance.belongsTo(User);

User.hasMany(Task, { foreignKey: 'assigned_to' });
Task.belongsTo(User, { as: 'assignedTo', foreignKey: 'assigned_to' });

User.hasMany(Task, { foreignKey: 'created_by' });
Task.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });

User.hasMany(Message);
Message.belongsTo(User);


// دالة لبدء الخادم ومزامنة النماذج مع قاعدة البيانات
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await sequelize.sync({ alter: true });  
    console.log('✅ All models synced.');

   
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}




export { sequelize, Office, User, Attendance, Task, Message, startServer };