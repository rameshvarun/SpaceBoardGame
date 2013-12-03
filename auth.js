//Authentication libraries
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;

//Configuration and API Keys
var globals = require('./globals');

//User model
var User = require('./models/user').User;

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
    clientID: globals.FACEBOOK_APP_ID,
    clientSecret: globals.FACEBOOK_APP_SECRET,
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
									friends : [] } );
			
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