var Invite = require('./../models/invite').Invite;
var Game = require('./../models/game').Game;

var async = require('async');

//Index page
exports.get = function(req, res){
	if(req.user) {
		req.user.populate('friends').populate('games').populate(function (err, user)
		{
			res.render( 'dashboard.html', { user : user });
		});
	}
	else {
		res.render( 'index.html', { })
	}
};

exports.data = function(req, res){

	if(req.user) {
		if( req.query.action == "friends") {
			req.user.populate('friends')
			.populate('games')
			.populate(function (err, user) {
				var results = [];
				for(var i = 0; i < user.friends.length; ++i) {
					results.push( user.friends[i].toObject({ virtuals: true }) );
				}
				res.send( results );
			});
		}
		if( req.query.action == "me") {
			res.send(req.user);
		}
		if( req.query.action == "sentinvites") {
			Invite.find( { from : req.user._id } )
			.populate("from")
			.populate("to")
			.exec( function(err, invites) {
				res.send( invites );
			});
		}
		if( req.query.action == "recievedinvites") {
			Invite.find( { to : req.user._id } )
			.populate("from")
			.populate("to")
			.exec( function(err, invites) {
				res.send( invites );
			});
		}
		if( req.query.action == "games") {
			Game.find( { players : req.user._id, ended : false } )
			.populate("players")
			.exec( function(err, games) {
				res.send( games );
			});
		}
	}
	else {
		res.send( { error : "User is not logged in." } );
	}
	
	
}