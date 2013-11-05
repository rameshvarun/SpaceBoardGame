var db = require('./../db');
Schema = db.mongoose.Schema;

var request = require('request');
var async = require('async');
var crypto = require('crypto');

var userSchema = new Schema({
	facebook_id: String,
	facebook_access_token: String,
	display_name : String,
	username : { type: String, lowercase: true, trim: true },
	email : { type: String, lowercase: true, trim: true },
	password : String,
	date_registered : { type: Date, default: Date.now },
	date_last_login : { type: Date, default: Date.now },
	friends : [ { type: Schema.Types.ObjectId, ref: 'User' } ]
});



//Get's a url to the user's avatar
userSchema.virtual('avatar').get(function () {
	//First try Facebook
	if(this.facebook_id)
	{
		return "https://graph.facebook.com/" + this.facebook_id + "/picture";
	}
	
	//Then try gravater
	if(this.email)
	{
		var email = this.email.trim().toLowerCase()
		var hash = crypto.createHash('md5').update(name).digest("hex");
		return "http://www.gravatar.com/avatar/" + hash + "?s=50&d=mm";
	}

	//Default image
	return "http://www.gravatar.com/avatar/?s=50&d=mm";
});

//Recursively gets paginated data from the given facebook url
function getPagedData( data, url, callback )
{
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result = JSON.parse(body);
			
			if(result.paging.next) {
				getPagedData( result.data, result.paging.next, function(nextdata)
				{
					callback( nextdata );
				});
			}
			else {
				callback( data.concat(result.data) );
			}
		}
	});
}

//Looks to see if any of that user's Facebook friends have also logged into the app
userSchema.methods.findFacebookFriends = function (callback) {
	var me = this;
	var url = "https://graph.facebook.com/me/friends?access_token=" + me.facebook_access_token;
  
	console.log(this.friends);
	getPagedData([], url, function(data)
	{
		console.log(data.length + " Facebook friends found.");
		
		async.each(data, function(item, cb)
		{
			//For each Facebook friend, check if there is a user registered under that Facebook id
			User.findOne( { facebook_id : item.id }, function(err, user)
			{
				if(user) {
					//Add users to each others friend lists
					console.log(me);
					if(me.friends.indexOf(user._id) == -1)
						me.friends.push(user._id);
					if(user.friends.indexOf(me._id) == -1)
						user.friends.push(me._id);
					
					//Save the documents
					me.save();
					user.save();
				}
				
				//Done with this item
				cb();
			});
		},
		function(err){
			//Finished scanning for friends that use this app
			console.log("Scanned for Facebook friends.");
			callback();
		});
	});
}

var User = db.mongoose.model('User', userSchema);
exports.User = User;