var express = require('express');

var router = express.Router();

var c = require('./car');
router.use('/car', c);

module.exports = router;