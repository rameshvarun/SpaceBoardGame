exports.connect = function(socket)
{
	console.log('A socket has connected.');
	
	var game;
	
	var room;
	
	socket.on('setgame', function(data){
		room = data.gameid;
		socket.join(room);
	});
	
	socket.on('getchathistory', function(data){
	});
	
	socket.on('sendchatmessage', function(data){
		socket.broadcast.to( room ).emit('chatmessage', data);
	});
}