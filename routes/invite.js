var db = require('./../db');

var Invite = require('./../models/invite').Invite;

//Index page
exports.get = function(req, res){
	if(req.user) {
		if(req.query.action == "create") {
			if(req.query.users) {
				var invite = new Invite( { from : req.user._id } );
				
				//If this is a list of users or just a single user
				if( req.query.users instanceof Array ) {
					for(var i = 0; i < req.query.users.length; ++i) {
						invite.to.push( db.mongoose.Types.ObjectId(req.query.users[i]) );
						invite.accepted.push(false);
					}
				}
				else {
					invite.to.push( db.mongoose.Types.ObjectId(req.query.users) );
					invite.accepted.push(false);
				}
				
				if(req.query.message)
					invite.message = req.query.message;
					
				invite.save( function(err, user) {
					res.send( { message : "success" } );
				});
			}
			else {
				res.send("No users specified to invite.");
			}
		}
		if(req.query.action == "accept") {
			if(req.query.inviteid) {
				Invite.findById(req.query.inviteid, function(err, invite) {
					if(invite) {
						index = invite.to.indexOf(req.user._id);
						invite.accepted[index] = true;
						
						invite.save( function(err, user) {
							invite.ready();
							res.send( { message : "Invite accepted." } );
						});
					}
					else {
						res.send("Could not find invite with that id.");
					}
				});
			}
			else {
				res.send("No invite id specified.");
			}
		}
		if(req.query.action == "decline") {
			if(req.query.inviteid) {
				Invite.findById(req.query.inviteid, function(err, invite) {
					if(invite) {
						invite.remove( function(err) {
							res.send( { message : "Invite declined." } );
						});
					}
					else {
						res.send("Could not find invite with that id.");
					}
				});
			}
			else {
				res.send("No invite id specified.");
			}
		}
	}
	else {
		res.send("Not logged in.");
	}
};