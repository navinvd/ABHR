const dotenv = require('dotenv').config();

module.exports = {
    "node_port": process.env.NODE_PORT,
    "FRONT_END_URL": process.env.FORNT_END_URL,
    "BACK_END_URL": "http://localhost:3000/",
    "database": process.env.DATABASE,
    //Token
    'ACCESS_TOKEN_SECRET_KEY': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',

    //Email Configuration
    'SMTP_SERVICE': 'gmail',
    // 'SMTP_MAIL': 'demo.narolainfotech@gmail.com',
    // 'SMTP_PASSWORD': 'Password123#',
    'SMTP_MAIL': 'abhrrentals@gmail.com',
    'SMTP_PASSWORD': 'abhr@123',

    //Encription
    "SALT_WORK_FACTOR": 10,
    
    //Status Configuration
    "OK_STATUS": 200,
    "BAD_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "NOT_FOUND": 404,
    "MEDIA_ERROR_STATUS": 415,
    "VALIDATION_FAILURE_STATUS": 417,
    "DATABASE_ERROR_STATUS": 422,
    "INTERNAL_SERVER_ERROR": 500
};