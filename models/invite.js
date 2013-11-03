var db = require('./../db');
Schema = db.mongoose.Schema;

var Game = require('./../models/game').Game;

var inviteSchema = new Schema({
	from : { type: Schema.Types.ObjectId, ref: 'User' },
	to : [ { type: Schema.Types.ObjectId, ref: 'User' } ],
	message : String,
	date_created : { type: Date, default: Date.now },
	accepted : [Boolean]
});

//If all players have accepted the invite, start a game
inviteSchema.methods.ready = function () {
	var me = this;
	
	console.log("Checking if the invite is ready to start a game.");
	for(i = 0; i < this.accepted.length; ++i) {
		if( this.accepted[i] == false) {
			return;
		}
	}
	
	console.log("All players have accepted - starting game.");
	
	//Add all players to the list
	var player_list = [];
	player_list.push(this.from);
	for(i = 0; i < this.to.length; ++i) {
		player_list.push( this.to[i] );
	}
	
	//Shuffle players
	player_list.sort( function() { return Math.random() - 0.5 } );
	
	var game = new Game( { players : player_list} );
	game.save( function(err, game) {
		//Generate board
		game.generateBoard();
		
		//Remove the index object
		me.remove();
	} );
}

exports.Invite = db.mongoose.model('Invite', inviteSchema);