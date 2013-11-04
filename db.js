var mongoose = require('mongoose');

var crypto = require('crypto');

var dburi = process.env.MONGOLAB_URI ||
			process.env.MONGOHQ_URL || 
			'mongodb://localhost/spacegame';

mongoose.connect(dburi);

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("Successfully connected to MongoDB.");
});

exports.mongoose = mongoose;

if (process.env.REDISTOGO_URL) {
	var rtg = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);
	redis.auth(rtg.auth.split(":")[1]);
	exports.redis = redis;
} else {
	var redis = require("redis").createClient();
	exports.redis = redis;
}