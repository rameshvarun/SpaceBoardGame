var db = require('./../db');
Schema = db.mongoose.Schema;


var gameSchema = new Schema({
	players : [ { type: Schema.Types.ObjectId, ref: 'User' } ],
	currentPlayer : { type: Number, default: 0 },
	turn : { type: Number, default: 0 },
	phase : { type: Number, default: 0 },
	chat : Schema.Types.Mixed,
	ended : { type: Boolean, default: false },
	board : Schema.Types.Mixed
});

function countNeighbors(board, x, y, term) {
	var count = 0;
	
	for( var  i = x - 1; i <= x + 1; ++i) {
		for( var  j = y - 1; j <= y + 1; ++j) {
			if( !(i == x && y == 0 ) && //Not the center square
				i >= 0 && i < board.length &&
				j >= 0 && j < board[0].length
				) {
				
				count++;
			}
		}
	}
	
	return count;
}

gameSchema.methods.generateBoard = function ( callback ) {
	var me = this;
	
	var num_players = me.players.length;
	
	var board_width = num_players*6;
	var board_height = num_players*6;
	
	me.board = {}
	me.board.terrain = []
	
	//Create empty board
	for(var i = 0; i < board_width; ++i) {
		me.board.terrain.push( [] );
		for(var j = 0; j < board_height; ++j) {
			me.board.terrain[i].push( "" );
		}
	}
	
	//Place stars
	var num_stars = 1 + Math.floor( num_players / 3);
	for(var i = 0; i < num_stars; ++i) {
		var x = 0;
		var y = 0;
		do {
			x = Math.floor( Math.random() * board_width*0.1 );
			y = Math.floor( Math.random() * board_width*0.1 );
		} while( me.board.terrain[x][y] != "" )
		
		me.board.terrain[x][y] = "s:" + Math.floor((Math.random()*2)+1);
	}
	
	//Place asteroid fields
	for( var n = 0; n < 3; ++n ) {
		for(var i = 0; i < board_width; ++i) {
			for(var j = 0; j < board_height; ++j) {
				if( board[i][j] == "" ) {
					var count = countNeighbors( board, i, j, "a" );
					var chance = 0.05 + 0.05*count;
					
					if(Math.random() < chance) {
						board[i][j] = "a";
					}
				}
			}
		}
	}
	
	//Clear chat history to empty array
	me.chat = [];
	me.markModified('chat');
		
	me.markModified('board');
	me.save( function(err) {
		if(callback)
			callback();
	} );
}

exports.Game = db.mongoose.model('Game', gameSchema);