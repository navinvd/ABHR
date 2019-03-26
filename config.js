const dotenv = require("dotenv").config();

module.exports = {
  node_port: process.env.NODE_PORT,
  IS_HTTPS: process.env.IS_HTTPS,
  SSL_CERT: process.env.SSL_CERT,
  SSL_KEY: process.env.SSL_KEY,
  FRONT_END_URL: process.env.FORNT_END_URL,
  BACK_END_URL: process.env.SERVER,
  database: process.env.DATABASE,
  mimetypes: [
    "image/vnd.wap.wbmp",
    "image/vnd.rn-realflash",
    "image/x-pcx",
    "image/x-pict",
    "image/png",
    "image/x-xwd",
    "image/jpeg",
    "image/jpg",
    "image/bmp",
    "image/webp",
    "image/vnd.microsoft.icon",
    "image/x-windows-bmp",
    "image/x-dwg",
    "image/fif",
    "image/florian",
    "image/vnd.fpx",
    "image/vnd.net-fpx",
    "image/g3fax",
    "image/gif",
    "image/x-icon",
    "image/vnd.dwg",
    "image/svg+xml",
    "image/ief",
    "image/pipeg",
    "image/tiff",
    "image/x-cmx",
    "image/x-portable-anymap",
    "image/x-portable-bitmap",
    "image/x-portable-graymap",
    "image/cmu-raster",
    "image/x-quicktime",
    "image/vnd.xiff",
    "image/xbm",
    "image/x-xbm",
    "image/x-rgb"
  ],
  //Token
  ACCESS_TOKEN_SECRET_KEY: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",

  //Email Configuration
  SMTP_SERVICE: "gmail",
  // 'SMTP_MAIL': 'demo.narolainfotech@gmail.com',
  // 'SMTP_PASSWORD': 'Password123#',
  SMTP_MAIL: "abhrrentals@gmail.com",
  SMTP_PASSWORD: "abhr@123",

  //Encription
  SALT_WORK_FACTOR: 10,

  //Status Configuration
  OK_STATUS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  MEDIA_ERROR_STATUS: 415,
  VALIDATION_FAILURE_STATUS: 417,
  DATABASE_ERROR_STATUS: 422,
  INTERNAL_SERVER_ERROR: 500,

  //Sms service
  NEXMO_API_KEY: process.env.NEXMO_APIKEY,
  NEXMO_API_SECRET: process.env.NEXMO_APISECRET,

  // Notification
  // "USER_ANDROID_SERVER_KEY":"AAAAyNVjkEY:APA91bEsFtitqIyV9zI37z2DE8-DMnZ81LS_lvZzf4BBmN4eEFk2hQ4H3KHHi5YGyVQSHp6hqjAjoOJx5gTog6HPMQy_UFokkdpeWbQyoaQ9INvlef8tlluwQqDMvCrQpdPTiW0dtBn8",

  USER_ANDROID_SERVER_KEY:
    "AAAAbhEsC0M:APA91bGykPgFYX5b4yLpkBSpSu3OL7876duingdR574QClTlxJobmzw-1L_wN_2i7qZUiq0e4Yy6l9ymC1NzzFc6TAV1Y8u-iCNk6c_jR6co8aQOhBfeztC4MMvAXI86UL_BRf9E4Lq9",

  AGENT_ANDROID_SERVER_KEY:
    "AAAA3x6VQ8k:APA91bELqqBa19SaLkuwX3eQgVZLBRMMPpppV3cVL6i5pJ_k8XVEkdgdrMel59qOEXCuZeBCgGn1SMHubvVksBAa6DPJhcYVGWGaHU5VOCxc-uu2t_Ax2L7sET-Lia150JZ0KR23YW-T"
};
