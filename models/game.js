var db = require('./../db');
Schema = db.mongoose.Schema;


var gameSchema = new Schema({
	players : [ { type: Schema.Types.ObjectId, ref: 'User' } ],
	currentPlayer : { type: Number, default: 0 },
	turn : { type: Number, default: 0 },
	phase : { type: Number, default: 1 },
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

gameSchema.methods.evaluatePlanets = function () {
}

gameSchema.methods.collectIncome = function () {
}

gameSchema.methods.generateBoard = function ( callback ) {
	var me = this;
	
	me.board = require('./../boards/basic_twoplayer');
	
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