var db = require('./../db');
Schema = db.mongoose.Schema;


var inviteSchema = new Schema({
	from : { type: Schema.Types.ObjectId, ref: 'User' },
	to : [ { type: Schema.Types.ObjectId, ref: 'User' } ],
	message : String
});

exports.Invite = db.mongoose.model('Invite', inviteSchema);