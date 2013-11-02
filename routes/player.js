var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

//Configuration and API Keys
var globals = require('./../globals');

var crypto = require('crypto');
var db = require('./../db');

//Player page
exports.get = function(req, res){
	if(!req.session.user_token) {
		req.session.user_token = crypto.randomBytes(48).toString('hex');
		db.redis.set(req.session.user_token, req.user.id);
	}
	
	res.render( 'basicplayer.html', { APP_URL : globals.APP_URL,
								GAMEID : req.query.id,
								USERTOKEN : req.session.user_token})
};