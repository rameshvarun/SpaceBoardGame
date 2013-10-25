var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

//Configuration and API Keys
var globals = require('./../globals');

//Player page
exports.get = function(req, res){
	res.render( 'player.html', { APP_URL : globals.APP_URL,
								GAMEID : req.query.id})
};