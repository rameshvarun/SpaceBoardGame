//Import all libraries
var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var passport = require('passport');
var socketio = require('socket.io');

var app = express();

//All environments
app.set('port', process.env.PORT || 3000);

//Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

//Start server on the correct port number
var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});