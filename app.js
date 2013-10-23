//Import all libraries
var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var socketio = require('socket.io');
var db = require('./db');
var globals = require('./globals');

var app = express();

var keys = require('./keys.json');

passport.use(new FacebookStrategy({
    clientID: keys.FACEBOOK_APP_ID,
    clientSecret: keys.FACEBOOK_APP_SECRET,
    callbackURL: globals.APP_URL + "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
	
  }
));

app.use(express.logger('dev')); //Logging
app.use(express.bodyParser()); //Parses form data
app.use(express.favicon()); //Favicon

//Register Swig as template parser
app.engine('html', swig.renderFile);
app.set('views', __dirname + '/views');
app.set('view cache', false);
swig.setDefaults({ cache: false });

//Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

//All the application routes

//Authentication routes
app.get('/auth/facebook', passport.authenticate('facebook')); //Let's users login to Facebook
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' })); //Facebook redirects users here after they log in

//Start server on the correct port number
var server = http.createServer(app);
server.listen( globals.PORT, function(){
  console.log('Express server listening on port ' + globals.PORT);
});