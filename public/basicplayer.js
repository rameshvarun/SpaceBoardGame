//Connect to the server
var socket = io.connect(APP_URL);

function addToChat(data) {
	$( "#chatbox" ).append(data.message + "<br>");
}

socket.on('chatmessage', function (data) {
	addToChat(data);
});

$( document ).ready(function() {
	$( "#sendmsg" ).click(function() {
		var data = { message : $("#msg").val(),
						date : new Date()};
		
		socket.emit('sendchatmessage', data);
		addToChat(data);
		
		$("#msg").val('');
	});
});