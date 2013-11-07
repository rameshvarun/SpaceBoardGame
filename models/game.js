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

var balance = require('./../public/balance');

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

function getMaxOfArray(numArray) {
	return Math.max.apply(null, numArray);
}

function count(array, value) {
	var n = 0;
	for(var i = 0; i < array.length; ++i) {
		if(array[i] == value)
			++n;
	}
	
	return n;
}

gameSchema.methods.evaluatePlanets = function (callback) {
	var me = this;
	
	me.board.planets.forEach(function(planet, index) {
		var counts = [];
		for(var i = 0; i < me.players.length; ++i) {
			counts.push(0);
		}
		
		for(var i = 0; i < me.board.ships.length; ++i) {
			var ship = me.board.ships[i];
			if( Math.abs(ship.x - planet.x) < 2 && Math.abs(ship.y - planet.y) < 2 ) {
				counts[ship.side] = counts[ship.side] + 1;
			}
		}
		
		var largest = getMaxOfArray(counts);
		if(largest > 0 && count(counts, largest) == 1) {
			planet.side = counts.indexOf(largest);
		}
	});
	
	me.markModified('board');
	me.save( function(err) {
		callback();
	});
}

gameSchema.methods.applyRepairs = function(callback) {
	var me = this;

	for(var i = 0; i < me.board.ships.length; ++i) {
		var ship = me.board.ships[i];

		//If some health hasn't been initialized yet, then set it
		if(!ship.hp)
			ship.hp = balance[ship.type].HP;
		if(!ship.sp)
			ship.sp = balance[ship.type].SP;

		//Heal the current player's units
		if(ship.side == me.currentPlayer) {
			ship.hp += balance[ship.type].Repair;
			if(ship.hp > balance[ship.type].HP)
				ship.hp = balance[ship.type].HP;

			ship.sp = balance[ship.type].SP; //All shields are restored
		}
	}

	me.markModified('board');
	me.save( function(err) {
		callback();
	});
}

gameSchema.methods.isSunEffects = function(x, y) {
	return this.board.terrain[y][x] == 2;
}

gameSchema.methods.evaluateSquare = function (x, y, attackerSide) {
	var me = this;

	var attackers = [];
	var defender = null;
	var adjacent = [];

	//Get list of attackers, defender, and adjacent defender
	for(var n = 0; n < me.board.ships.length; ++n) {
		var ship = me.board.ships[n];

		if(x == ship.x && y == ship.y) {
			if(ship.side == attackerSide) { //Attacking ship
				attackers.push(ship);
			}
			else { //Defending ship
				defender = ship;
			}
		}
		else if(Math.abs(ship.x - x) <= 1 && Math.abs(ship.y - y) <= 1) {
			if(ship.side != attackerSide) {
				adjacent.push(ship);
			}
		}
	}

	//Set attacker sp
	attackers.forEach(function(ship, index, array) {
		if(me.isSunEffects(ship.x, ship.y))
			ship.sp = 0;
	});

	//Set defender sp
	if(me.isSunEffects(defender.x, defender.y)) {
		defender.sp = 0;
	}

	var turn = 0;

	
	//Combat iterations
	while(true) {

		//End combat if all attackers have died

		//End combat if the defender has died

		turn++;
	}
	

	//Remove dead ships
}

gameSchema.methods.evaluateCombat = function (callback) {
	var me = this;

	for(var x = 0; x < me.board.terrain[0].length; ++x) {
		for(var y = 0; y < me.board.terrain.length; ++y) {
			var count = 0;

			for(var n = 0; n < me.board.ships.length; ++n) {
				var ship = me.board.ships[n];
				if(x == ship.x && y == ship.y) {
					++count;
				}
			}

			if(count > 1) {
				console.log(count + " " + x + " " + y);
				me.evaluateSquare(x, y, me.currentPlayer);
			}
		}
	}

	me.markModified('board');
	me.save( function(err) {
		callback();
	});
}

//Evaluates resource stations and 
gameSchema.methods.collectIncome = function (userindex, callback) {
	var me = this;
	
	var resource_count = 0;
	
	//Evaluate resource stations
	me.board.resource_stations.forEach(function(station, index) {
		for(var i = 0; i < me.board.ships.length; ++i) {
			var ship = me.board.ships[i];
			if(station.x == ship.x && station.y == ship.y) {
				station.side = ship.side;
				break;
			}
		}
		
		if(station.side == userindex) {
			resource_count++;
		}
	});
	
	me.board.banks[userindex] += balance.salary;
	me.board.banks[userindex] += resource_count*balance.resource_salary;
	
	me.markModified('board');
	me.save( function(err) {
		callback();
	});
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