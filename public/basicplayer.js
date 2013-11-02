//Connect to the server
var socket = io.connect(APP_URL);

socket.emit('setuser', { usertoken : USERTOKEN }); //Tell server the current user
socket.emit('setgame', { gameid :  GAMEID }); //Tell server the current game id

var me = null;
var game = null;
socket.on('userinfo', function (data) {
	me = data;
});
socket.on('game', function (data) {
	game = data;
});

//What to do when a chat message is recieved
function addToChat(data) {
	$( "#chatbox" ).append("<b>" + data.sender + "</b>: " + data.message + "<br>");
}
socket.on('chatmessage', function (data) {
	addToChat(data);
});

$( document ).ready(function() {
	$( "#sendmsg" ).click(function() {
		var data = {sender : me.display_name,
					message : $("#msg").val(),
					date : new Date() };
		
		socket.emit('sendchatmessage', data);
		addToChat(data);
		
		$("#msg").val('');
	});
});