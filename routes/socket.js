var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

var db = require('./../db');

var balance = require('./../public/balance');

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
	
	socket.on('moveship', function(data) {
		game.board.ships[data.index].hasmoved = true;
		game.board.ships[data.index].x = data.x;
		game.board.ships[data.index].y = data.y;
		
		game.markModified('board');
		game.save();
		
		socket.broadcast.to( room ).emit('moveship', data); //Send it to clients
	});
	
	socket.on('getchathistory', function(data){
	});
	
	socket.on('sendchatmessage', function(data){
		socket.broadcast.to( room ).emit('chatmessage', data); //Send it to clients
	});
	
	socket.on('endmovement', function(data){
		game.phase = 2;
		game.save();
		socket.broadcast.to( room ).emit('endmovement', data); //Send it to clients
	});
	
	socket.on('enddeploy', function(data){
		//Increment phase
		game.phase = 3;
		
		//Evaluate planets and collect income
		game.evaluatePlanets();
		game.collectIncome();
		
		//Save game
		game.save();
		socket.broadcast.to( room ).emit('enddeploy', data); //Send it to clients
	});
	
	socket.on('endbuy', function(data){
		//Start next player's turn
		game.phase = 1;
		++game.turn;
		if(game.currentPlayer < game.players.length - 1)
			++game.currentPlayer;
		else
			game.currentPlayer = 0;
			
		for(var i = 0; i < game.board.ships.length; ++i) {
			game.board.ships[i].hasmoved = false;
		}
		
		game.markModified('board');
		
		game.save();
		socket.broadcast.to( room ).emit('endbuy', data); //Send it to clients
	});
}