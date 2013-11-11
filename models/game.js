var db = require('./../db');
var async = require('async');

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
		if(!("hp" in ship))
			ship.hp = balance[ship.type].HP;
		if(!("sp" in ship))
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
gameSchema.methods.isAsteroid = function(x, y) {
	return this.board.terrain[y][x] == 3;
}
gameSchema.methods.isNebula = function(x, y) {
	return this.board.terrain[y][x] == 4;
}


function randInt(min, max) {
	return Math.floor( Math.random() * (max - min + 1) ) + min;
}

gameSchema.methods.evaluateSquare = function (x, y, attackerSide) {
	var me = this;

	console.log("Fight on square (" + x + ", " + y + ")");

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

	console.log("Attackers: " + attackers);
	console.log("Defender: " + defender);
	console.log("Adjacent: " + adjacent);

	//Set attacker sp
	attackers.forEach(function(ship, index, array) {
		if(me.isSunEffects(ship.lastx, ship.lasty)) { //Attacker uses space they came from
			ship.sp = 0;
			console.log("Due to sun effects, attacker shields are down.");
		}
	});

	//Set defender sp
	if(me.isSunEffects(defender.x, defender.y)) { //Defender uses current space
		defender.sp = 0;
		console.log("Due to sun effects, defender shields are down.");
	}

	//Target selection logic for the defender
	function findTarget(ships, energy) {
		var minIndex = -1;
		
		if(energy) {
			for(var i = 0; i < ships.length; ++i) {
				if(ships[i].hp > 0) {
					if(minIndex == -1) {
						minIndex = i;
					}
					else {
						if( (ships[i].hp + ships[i].sp) < (ships[minIndex].hp + ships[minIndex].sp) ) {
							if( (ships[i].sp + ships[i].hp/2) <= balance[defender.type].TAMin) {
							}
							else {
								minIndex = i;
							}
						}
					}
				}
			}
		}
		else {
			for(var i = 0; i < ships.length; ++i) {
				if(ships[i].hp > 0) {
					if(minIndex == -1) {
						minIndex = i;
					}
					else {
						if( (ships[i].hp + ships[i].sp) < (ships[minIndex].hp + ships[minIndex].sp) ) {
							minIndex = i;
						}
					}
				}
			}
		}
		
		return ships[minIndex];
	}

	function attacker_turn() {
		attackers.forEach(function(attacker, index, array) { //Foreach attacker
			if(attacker.hp > 0) {
				console.log("	Attacking " + balance[attacker.type].name + " attacks...\n");

				//Energy attack first
				var ea = randInt( balance[attacker.type].EAMin, balance[attacker.type].EAMax );
				console.log("		Attacker rolls " + ea + " for energy weapons...");

				//Calculate defender's manueverability percentage
				var mp = randInt( balance[defender.type].MPMin, balance[defender.type].MPMax );
				console.log("		Defender rolls " + mp + " for maneuvarability...");

				//Asteroid detriment
				if(me.isAsteroid(defender.x, defender.y)) {
					mp -= 1;
					console.log("			Asteroid subtracts 1 mp...");
				}
				//Nebula bonus
				if(me.isNebula(defender.x, defender.y)) {
					mp += 1;
					console.log("			Nebula adds 1 mp...");
				}

				//TODO Subtract 1 mp if there is an attacking support cruiser within 2 squares

				//MP must be between 0 and 10 inclusive
				if(mp < 0) mp = 0;
				if(mp > 10) mp = 10;
				console.log("			Final mp is " + mp + "...");

				var damage = ea - (mp/10.0)*ea;
				console.log("		Defender takes " + damage + " damage from energy weapons...");

				if( defender.sp > 0) {
					defender.sp -= damage;
					
					if(defender.sp < 0) {
						defender.hp += defender.sp;
						defender.sp = 0;
						console.log("		Defender shields are down...");
					}
				}
				else {
					defender.hp -= damage;
				}

				//Torpedo
				var ta = randInt( balance[attacker.type].TAMin, balance[attacker.type].TAMax ); //Roll for base torpedo attack
				console.log("		Attacker rolls " + ta + " for torpedo weapons...");
				if( defender.sp > 0) {
					defender.sp -= ta;
					
					if(defender.sp < 0) {
						defender.hp += defender.sp*2; //Missiles do double damage to hull
						defender.sp = 0;
						console.log("		Defender shields are down...");
					}
				}
				else {
					defender.hp -= ta*2; //Missiles do double damage to hull
				}
			}
		});
	}

	function defender_turn() {
		console.log("	Defending " + balance[defender.type].name + " attacks...\n");

		var target = findTarget( attackers, true ); //Select energy weapons target

		if(target) {
			//Energy weapons
			var ea = randInt( balance[defender.type].EAMin, balance[defender.type].EAMax );
			console.log("		Defender rolls " + ea + " for energy weapons...");

			var mp = randInt( balance[target.type].MPMin, balance[target.type].MPMax );
			console.log("		Attacker rolls " + mp + " for maneuvarability...");

			//Asteroid detriment
			if(me.isAsteroid(target.lastx, target.lasty)) {
				mp -= 1;
				console.log("			Asteroid subtracts 1 mp...");
			}
			//Nebula bonus
			if(me.isNebula(target.lastx, target.lasty)) {
				mp += 1;
				console.log("			Nebula adds 1 mp...");
			}

			//TODO Subtract 1 mp if there is a defending support cruiser within 2 squares

			//MP must be between 0 and 10 inclusive
			if(mp < 0) mp = 0;
			if(mp > 10) mp = 10;
			console.log("			Final mp is " + mp + "...");

			var damage = ea - (mp/10.0)*ea;
			console.log("		Attacker takes " + damage + " damage from energy weapons...");

			if( target.sp > 0) {
				target.sp -= damage;
				
				if(target.sp < 0) {
					target.hp += target.sp;
					target.sp = 0;
					console.log("		Attacker shields are down...");
				}
			}
			else {
				target.hp -= damage;
			}
		}

		var target = findTarget( attackers, false ); //Select missile weapons target
		if(target) {
			//Missile weapons
			var TAMax = balance[defender.type].TAMax;
			console.log("			Base TAMax is " + TAMax + "...");

			//Take adjacent defenders into account
			for(var i = 0; i < adjacent.length; ++i) {
				TAMax += balance[adjacent[i].type].TAMin;
			}
			console.log("			Final TAMax is " + TAMax + "...");

			var ta = randInt( balance[defender.type].TAMin, TAMax );
			console.log("		Defender rolls " + ta + " for missile weapons...");

			if( target.sp > 0) {
				target.sp -= ta;
				
				if(target.sp < 0) {
					target.hp += target.sp*2; //Missiles do double damage to hull
					target.sp = 0;
					console.log("		Attacker shields are down...");
				}
			}
			else {
				target.hp -= ta*2; //Missiles do double damage to hull
			}
		}
	}

	var turn = 1;

	
	//Combat iterations
	while(true) {

		console.log("	Starting turn " + turn);

		//Fight
		attacker_turn();
		defender_turn();

		//Sun effects
		attackers.forEach(function(ship, index, array) {
			if(me.isSunEffects(ship.lastx, ship.lasty))
				ship.hp -= balance.sun_effects;
		});
		if(me.isSunEffects(defender.x, defender.y)) {
			defender.hp -= balance.sun_effects;
		}

		//Determine if simulation should stop
		var stop = false;

		//End combat if the defender has died
		if(defender.hp <= 0) {
			console.log("Battle ended because defender died...");
			stop = true;
		}

		//End combat if all attackers have died
		var dead_attackers = 0;
		attackers.forEach(function(ship, index, array) {
			if(ship.hp <= 0)
				++dead_attackers;
		});
		if(dead_attackers == attackers.length) {
			console.log("Battle ended because all attackers died...");
			stop = true;
		}

		if(stop)
			return;
		else
			turn++;
	}
}

gameSchema.methods.evaluateCombat = function (callback) {
	var me = this;

	//Find squares where there are more than one ship
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

	//Remove dead ships
	me.board.ships = me.board.ships.filter(function(ship, index, array) {
		if(!("hp" in ship))
			return true;

		if(ship.hp > 0)
			return true;
		else
			return false;
	});

	//Save changes and end evaluation
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