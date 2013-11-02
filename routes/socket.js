var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

var db = require('./../db');

exports.connect = function(socket)
{
	console.log('A socket has connected.');
	
	var game;
	
	var room;
	
	var user;
	
	socket.on('setuser', function(data){
		//Look up using access token
		db.redis.get(data.usertoken, function(err, user_id) {
			User.findById(user_id, function(err, user_doc) {
				user = user_doc;
				console.log('Successfully associated socket with user.');
				socket.emit('userinfo', user);
			});
		});
	});
	
	socket.on('setgame', function(data){
		room = data.gameid;
		socket.join(room);
		
		Game.findById(data.gameid, function(err, game_doc) {
				game = game_doc;
				game.populate('players', function (err, game) {
					console.log('Successfully associated socket with game.');
					socket.emit('game', game);
				});	
		});
	});
	
	socket.on('getchathistory', function(data){
	});
	
	socket.on('sendchatmessage', function(data){
		socket.broadcast.to( room ).emit('chatmessage', data); //Send it to clients
	});
}