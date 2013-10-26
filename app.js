//Import all libraries
var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var socketio = require('socket.io');

//Authentication libraries
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;

//Configuration and API Keys
var globals = require('./globals');
var keys = require('./keys.json');

var app = express();

var User = require('./models/user').User;
var Game = require('./models/game').Game;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Passport Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: keys.FACEBOOK_APP_ID,
    clientSecret: keys.FACEBOOK_APP_SECRET,
    callbackURL: globals.APP_URL + "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne( { facebook_id : profile.id }, function(err, user)
	{
		if(user)
		{
			console.log("Existing Facebook user. Refreshed access token.");
			user.facebook_access_token = accessToken;
			
			user.save(function(err, user)
			{
				user.findFacebookFriends(function()
				{
					done(null, user);
				});	
			});
		}
		else
		{
			console.log("New Facebook user - database entry created.");
			var user = new User( { facebook_id : profile.id,
									facebook_access_token : accessToken,
									display_name : profile.displayName,
									friends : [],
									games : []  }
									);
			
			user.save( function(err, user)
			{
				user.findFacebookFriends(function()
				{
					done(null, user);
				});
			});			
		}
	});
  }
));

//TODO: Passport Local Strategy

app.use(express.logger('dev')); //Logging
app.use(express.bodyParser()); //Parses form data
app.use(express.favicon()); //Favicon

//Needed for user sessions
app.use(express.cookieParser()); //Parsing cookies
app.use(express.session({ secret: keys.SESSION_TOKEN }));

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
app.get('/player', require('./routes/player').get);

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

var io = socketio.listen(server);

io.sockets.on('connection', require('./routes/socket').connect )