var db = require('./../db');
Schema = db.mongoose.Schema;


var gameSchema = new Schema({
	players : [ { type: Schema.Types.ObjectId, ref: 'User' } ],
	currentPlayer : Number
});

exports.Game = db.mongoose.model('Game', gameSchema);