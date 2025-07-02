import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', // مستويات: error, warn, info, verbose, debug, silly
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // تظهر على الكونسول
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), // أخطاء فقط في ملف
    new winston.transports.File({ filename: 'logs/combined.log' }), // كل اللوج في ملف
  ],
});

export default logger;
