var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auth = require('./middlewares/auth');
var db = require('./database/mongoDbConnection');
var expressValidator = require('express-validator');
var fileUpload = require('express-fileupload');

/* config files */
var config = require('./config');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(fileUpload());
app.use(logger('dev'));
app.use(bodyParser.json({limit: '1000mb'}));

app.use(bodyParser.urlencoded({limit: '2000mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'doc')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use(function (req, res, next) {
    console.log('here===>', config.node_port);
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'x-access-token,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    if (req.method == 'OPTIONS') {
        res.status(200).json();
    } else {
        next()
    }
});
app.use(expressValidator());
app.use(require("./controllers/"));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.json({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.log("global error");
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: {}
    });
});

//} else {
    // var server = app.listen((config.node_port || 3000), function () {
    //     console.log('Listening on port ' + (config.node_port || 3000) + '...');
    // });
    // socket.socketStartUp(server);

module.exports = app;
