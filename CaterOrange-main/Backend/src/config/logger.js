// module.exports = logger;
const winston = require('winston');
const gidStorage = require('./gidStorage'); // Import gidStorage
require('dotenv').config();
const { combine, timestamp, json, printf, errors, splat, colorize } = winston.format;
const fs = require('fs');
const path = require('path');
const dailyRotateFile = require('winston-daily-rotate-file');

// Create logs directory if it doesn't exist
const logDir = path.resolve(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define custom log levels
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'cyan'
    }
};

// Apply custom colors to the levels
winston.addColors(customLevels.colors);

// Function to get the filename from the stack trace
const getFileNameFromStack = () => {
    const stack = new Error().stack.split('\n');
    for (let i = 3; i < stack.length; i++) {
        const match = stack[i].match(/\s+at\s+.+\s+\((.+):[\d]+:[\d]+\)/);
        if (match && match[1]) {
            return path.basename(match[1]);
        }
    }
    return 'unknown';
};

// Custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, filename }) => {
    const gid = gidStorage.getGid(); // Get the GID
    return `[${timestamp}] [${level.toUpperCase()}] [File: ${filename || 'unknown'}] [UserId: ${gid}]: ${message}`;
});

// Configure the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: customLevels.levels,
    format: combine(
        timestamp(),
        errors({ stack: true }),
        splat(),
        json()
    ),
    transports: [
        new dailyRotateFile({
            filename: path.join(logDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '1m',
            maxFiles: '1d',
            format: combine(timestamp(), json())
        }),
        new dailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '1m',
            maxFiles: '1d',
            format: combine(timestamp(), json())
        }),
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp(),
                consoleFormat
            ),
        }),
    ],
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log'), format: combine(timestamp(), json()) })
);

process.on('unhandledRejection', (ex) => {
    throw ex;
});

// Wrapper functions for log levels to include filename and GID
const wrapLogFunction = (originalFunction) => {
    return function (message, meta = {}) {
        const filename = getFileNameFromStack();
        const gid = gidStorage.getGid(); // Get the GID for logging
        return originalFunction.call(this, message, { filename, gid, ...meta });
    };
};

// Wrap log functions to include filename and GID
logger.error = wrapLogFunction(logger.error);
logger.warn = wrapLogFunction(logger.warn);
logger.info = wrapLogFunction(logger.info);
logger.debug = wrapLogFunction(logger.debug);

module.exports = logger;
