module.exports = {
    "node_port": 3000,
    "FRONT_END_URL": "http://localhost:4200/#",
    "BACK_END_URL": "http://localhost:3000/",
    "database": "mongodb://abhr:WkEV9rTcS7@18.219.16.50:27017/abhr",
    //Token
    'ACCESS_TOKEN_SECRET_KEY': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',

    //Email Configuration
    'SMTP_SERVICE': 'gmail',
    'SMTP_MAIL': 'demo.narolainfotech@gmail.com',
    'SMTP_PASSWORD': 'Password123#',

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