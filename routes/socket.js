var User = require('./../models/user').User;
var Game = require('./../models/game').Game;

var db = require('./../db');

var balance = require('./../public/balance');

exports.connect = function(socket)
{
	console.log('A socket has connected.');
	
	var gameid;
	var room;
	var user;

	function getGame(callback) {
		Game.findById(gameid, function(err, game) {
			callback(game);
		});
	}
	
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

		gameid = data.gameid;
		
		getGame(function(game){
			game.populate('players', function (err, game) {
				console.log('Successfully associated socket with game.');
				socket.emit('game', game);
			});	
		});

	});
	
	socket.on('moveship', function(data) {
		getGame( function (game) {
			//Mark that the ship has already been moved
			game.board.ships[data.index].hasmoved = true;

			//Keep track of the unit's previous position
			game.board.ships[data.index].lastx = game.board.ships[data.index].x;
			game.board.ships[data.index].lasty = game.board.ships[data.index].y;

			//Move unit to the new spot
			game.board.ships[data.index].x = data.x;
			game.board.ships[data.index].y = data.y;
			
			//Save and send info to clients
			game.markModified('board');
			game.save(function (err) {
				socket.emit('moveship', data);
				socket.broadcast.to( room ).emit('moveship', data); //Send it to clients
			});
		});
	});
	
	socket.on('sendchatmessage', function(data){
		getGame( function (game) {
			game.chat.push(data);

			game.markModified('chat');
			game.save(function (err) {
				socket.broadcast.to( room ).emit('chatmessage', data); //Send it to clients
			});
		});
	});
	
	socket.on('endmovement', function(data){
		getGame( function (game) {
			game.phase = 2;

			game.evaluateCombat(function() {
				game.save(function (err) {

					//Tell clients destroy the ships killed in the combat iteration
					socket.emit('updateships', game.board.ships);
					socket.broadcast.to( room ).emit('updateships', game.board.ships);

					//Tell clients that the movement phase has ended
					socket.emit('endmovement', data);
					socket.broadcast.to( room ).emit('endmovement', data);
				});				
			});
		});
	});
	
	socket.on('enddeploy', function(data){
		getGame( function (game) {
			//Increment phase
			game.phase = 3;
			
			//Evaluate planets
			game.evaluatePlanets(function() {
				//Tell clients to update their planets
				socket.emit('updateplanets', game.board.planets);
				socket.broadcast.to( room ).emit('updateplanets', game.board.planets);
				
				//Evaluate resource stations / collect income
				game.collectIncome(game.currentPlayer, function()
				{
					//Tell clients to update their resource stations
					socket.emit('updatestations', game.board.resource_stations);
					socket.broadcast.to( room ).emit('updatestations', game.board.resource_stations);
					
					//Tell clients to update their banks
					socket.emit('updatebanks', game.board.banks);
					socket.broadcast.to( room ).emit('updatebanks', game.board.banks);
					
					//Save game
					game.save(function (err) {
						socket.emit('enddeploy', data);
						socket.broadcast.to( room ).emit('enddeploy', data); //Send it to clients
					});	
				});
			});
		});
	});

	socket.on('buyship', function(data){
		getGame( function (game) {
			game.board.banks[game.currentPlayer] -= balance[data.type].Cost;
			game.board.queue[game.currentPlayer].push(data.type);

			game.markModified('board');
			game.save(function (err) {
				//Tell clients to update their queues
				socket.emit('updatequeues', game.board.queue);
				socket.broadcast.to( room ).emit('updatequeues', game.board.queue);

				//Tell clients to update their banks
				socket.emit('updatebanks', game.board.banks);
				socket.broadcast.to( room ).emit('updatebanks', game.board.banks);
			});
		});
	});
	
	socket.on('endbuy', function(data) {
		getGame( function (game) {
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
			
			game.save(function (err) {
				socket.emit('endbuy', data);
				socket.broadcast.to( room ).emit('endbuy', data); //Send it to clients
			});
		});
	});

	socket.on('deployship', function(data) {
		getGame( function (game) {
			var type = game.board.queue[game.currentPlayer].splice(data.index, 1)[0];
			var newship = {
				type : type,
				x : data.x,
				y : data.y,
				side : game.currentPlayer,
				hasmoved : false
			};

			game.board.ships.push(newship);

			game.markModified('board');
			game.save(function (err) {
				//Tell clients to update their queues
				socket.emit('updatequeues', game.board.queue);
				socket.broadcast.to( room ).emit('updatequeues', game.board.queue);

				//Tell clients to add the newly deployed ship
				socket.emit('updateships', game.board.ships);
				socket.broadcast.to( room ).emit('updateships', game.board.ships);
			});
		});
	});
}