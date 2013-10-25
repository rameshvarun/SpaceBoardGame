var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

//User profile
exports.get = function(req, res){
	User.findById(req.query.id, function(err, user) {
		res.render( 'profile.html', { target : user })
	});
};