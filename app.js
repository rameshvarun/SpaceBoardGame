//Import all libraries
var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var socketio = require('socket.io');

//Authentication libraries
var passport = require('passport');
var auth = require('./auth');

//Configuration and API Keys
var globals = require('./globals');

var app = express();

app.use(express.logger('dev')); //Logging
app.use(express.bodyParser()); //Parses form data
app.use(express.favicon()); //Favicon

//Needed for user sessions
app.use(express.cookieParser()); //Parsing cookies
app.use(express.session({ secret: globals.SESSION_TOKEN }));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//App router
app.use(app.router);

//Register Swig as template parser
app.engine('html', swig.renderFile);
app.set('views', __dirname + '/views');
app.set('view cache', false);
swig.setDefaults({ cache: false });

//Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

//All the application routes
app.get('/', require('./routes/index').get);
app.get('/profile', require('./routes/profile').get);

app.get('/player', require('./routes/player').basicget);
app.get('/webglplayer', require('./routes/player').webglget);

app.get('/invite', require('./routes/invite').get);
app.get('/data', require('./routes/index').data);

//Authentication routes
app.get('/auth/facebook', passport.authenticate('facebook')); //Let's users login to Facebook
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' })); //Facebook redirects users here after they log in
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

//Start server on the correct port number
var server = http.createServer(app);
server.listen( globals.PORT, function(){
  console.log('Express server listening on port ' + globals.PORT);
});

//Start websockets server
var io = socketio.listen(server);
io.sockets.on('connection', require('./routes/socket').connect )