//Connect to the server
var socket = io.connect(APP_URL);

socket.emit('setuser', { usertoken : USERTOKEN }); //Tell server the current user

var player_colors = ["#27ADE3", "#B0D136", "#EE368A"];

var me = null;
var game = null;
var me_num = 0;

//Colors planets, resource stations, and ships according to their side
function color_divs() {
	$(".planet").each(function(index) {
		var planet = game.board.planets[ $( this ).attr("data-index") ];
		if(planet.side == null)
			$( this ).css("color", "black");
		else
			$( this ).css("color", player_colors[ planet.side ]);
	});
	
	$(".station").each(function(index) {
		var station = game.board.resource_stations[ $( this ).attr("data-index") ];
		if(station.side == null)
			$( this ).css("color", "black");
		else
			$( this ).css("color", player_colors[ station.side ]);
	});
	
	$(".ship").each(function(index) {
		var ship = game.board.ships[ $( this ).attr("data-index") ];
		if(ship.side == null)
			$( this ).css("color", "black");
		else
			$( this ).css("color", player_colors[ ship.side ]);
	});
}

socket.on('userinfo', function (data) {
	me = data;
	
	//After recieving user information, set the current game id
	socket.emit('setgame', { gameid :  GAMEID }); 
});

socket.on('updatestations', function (data) {
	game.board.resource_stations = data;
	color_divs();
});

socket.on('updateplanets', function (data) {
	game.board.planets = data;
	color_divs();
});

socket.on('updatebanks', function (data) {
	game.board.banks = data;
	update_banks();
});

function update_banks() {
	var $div = $('#banks');
	$div.html("");
	
	for(var i = 0; i < game.board.banks.length; ++i) {
		var name = (me_num == i) ? "Me" : game.players[i].display_name;
		$div.append(name + ": " + game.board.banks[i]);
		$div.append('<br>');
	}

	evaluate_purchasables();
}

socket.on('moveship', function (data) {
	me = data;
	var ship_index = data.index;
	var ship = game.board.ships[ship_index];
	ship.hasmoved = true;
	
	ship.x = data.x;
	ship.y = data.y;
	
	var $ship = null;
	$(".ship").each(function(index) {
		if($( this ).attr('data-index') == ship_index) {
			$ship = $( this );
		}
	});

	$ship.animate( {left : (ship.x)*gridSize,
					top : (ship.y)*gridSize}, 1000 );
});

//Get game balance information
var balance = null;
$.getJSON("/balance.json", function(data) {
	balance = data;

	//Populate buy ships dialog
	for( type in balance) {
		if(balance[type].name) {
			$div = $('#buyship-dialog');
			$div.append("<input class='buyshipbutton' data-shiptype='" + balance[type].name + "' id='buy" + balance[type].name + "' type='button' value='Buy a " + balance[type].name + " (" + balance[type].Cost + " Credits)'/><br>");
			
			$('.buyshipbutton').click(function() {
				socket.emit('buyship', { type : $(this).attr('data-shiptype') });
				console.log({ type : balance[type].name});
			});
		}
	}
});

function evaluate_purchasables() {
	for( type in balance) {
		if(balance[type].name) {
			$button = $('#buy' + balance[type].name);
			if(game.board.banks[me_num] < balance[type].Cost)
				$button.attr('disabled', true);
			else
				$button.attr('disabled', false);
		}
	}
}

function shipAt(x, y) {
	for(var n = 0; n < game.board.ships.length; ++n) {
		var ship = game.board.ships[n];
		if(ship.x == x && ship.y == y) {
			return true;
		}
	}
	return false;
}

function getDeploySquares() {
	var squares = [];

	for(var n = 0; n < game.board.planets.length; ++n) {
		var planet = game.board.planets[n];

		if(planet.side == me_num) {
			for(var i = -1; i <= 1; ++i) {
				for(var j = -1; j <= 1; ++j) {
					if(!(i == 0 && j == 0)) {
						if(!shipAt(planet.x + i, planet.y + j))
							squares.push([planet.x + i, planet.y + j]);
					}
				}
			}
		}
	}
	return squares;
}

function deploy_ship() {
	$('.deploy_selector').remove();

	socket.emit("deployship", { index : $( this ).attr("data-index"),
									x : $( this ).attr("data-x"), y : $( this ).attr("data-y")});
}

function update_queue() {
	$div = $('#queue');
	$div.html('');

	$.each(game.board.queue[me_num], function(index, ship) {
		$div.append("<div class='queueitem' data-index=" + index + " data-shiptype='" + ship + "'>" + ship + "</div>");
	});

	if(me_num == game.currentPlayer) {
		if(game.phase == 2) {
			$('.queueitem').each(function(index) {
				var queueindex = $(this).attr('data-index');

				var $button = $("<input class='deploybutton' data-index=" + queueindex + " type='button' value='Deploy'/>");
				$(this).append($button);

				$button.click(function() {
					$('.deploybutton').remove();
					$('.deploy_selector').remove();

					var squares = getDeploySquares();

					$.each(squares, function(index, square){
						var $div = $('<div class="deploy_selector"></div>');
						$( "#board" ).append( $div );
						
						$div.attr("data-index", queueindex);
						$div.attr("data-x", square[0]).attr("data-y", square[1]);
						$div.css( "left", square[0]*gridSize).css( "top", square[1]*gridSize);
						$div.width( gridSize ).height( gridSize );
						
						$div.click(deploy_ship);
					});
				});
			});
			
		}
	}
}

socket.on('updatequeues', function (data) {
	game.board.queue = data;
	update_queue();
});

socket.on('updateships', function (data) {
	game.board.ships = data;
	add_ships();
	color_divs();
});

function add_ships() {
	$('.ship').remove();

	//Add ship divs
	$.each( game.board.ships, function( index, ship ) {
		var $div = $('<div class="ship"></div>');
		
		$div.attr("data-index", index);
		
		$( "#board" ).append( $div );
		$div.html( balance[ship.type].abbreviation );
		
		$div.css( "left", ship.x*gridSize);
		$div.css( "top", ship.y*gridSize);
		$div.width( gridSize );
		$div.height( gridSize );
	});
}

function getMoveSquares(startx, starty, range) {
	var squares = [];
	
	function recursiveMove(x, y, order) {
		if(order < 0)
			return;
			
		if(x < 0 || y < 0)
			return;
		if(x >= game.board.terrain[0].length || y >= game.board.terrain.length)
			return;
			
		for(var i = 0; i < game.board.planets.length; ++i) {
			if(x == game.board.planets[i].x && y == game.board.planets[i].y)
				return;
		}
		
		var attackable = false;
		for(var i = 0; i < game.board.ships.length; ++i) {
			if(x == game.board.ships[i].x && y == game.board.ships[i].y) {
				if(game.board.ships[i].side == me_num)
					return;
				else
					attackable = true;
			}
		}

		if(game.board.terrain[y][x] == 1) {
			return;
		}
		
		var inSquares = false;
		for(var i = 0; i < squares.length; ++i) {
			if(x == squares[i][0] && y == squares[i][1])
				inSquares = true;
		}
		
		if(!inSquares)
			squares.push([x, y]);
		
		if(!attackable)
			for(var i = -1; i <= 1; ++i)
				for(var j = -1; j <= 1; ++j)
					recursiveMove(x + i, y + j, order - 1);
	}
	
	for(var i = -1; i <= 1; ++i)
			for(var j = -1; j <= 1; ++j)
				recursiveMove(startx + i, starty + j, range - 1);
	
	return squares;
}

var gridSize = 50;
socket.on('game', function (data) {
	game = data;

	//Populat chat history
	for(var i = 0; i < game.chat.length; ++i) {
		addToChat(game.chat[i]);
	}
	
	//Figure what number player I am
	for(var i = 0; i < game.players.length; ++i) {
		if( game.players[i]._id == me._id ) {
			console.log("Found my player number.");
			me_num = i;
			break;
		}
	}
	
	$( "#board" ).width( game.board.terrain[0].length * gridSize  );
	$( "#board" ).height( game.board.terrain.length * gridSize );
	
	//Terrain divs
	for(var x = 0; x < game.board.terrain[0].length; ++x) {
		for(var y = 0; y < game.board.terrain.length; ++y) {
			var $div = $('<div class="grid"></div>');
			$( "#board" ).append( $div );
			$div.css( "left", x*gridSize);
			$div.css( "top", y*gridSize);
			
			if( game.board.terrain[y][x] == 1 ) { //Sun
				$div.css( "background-color", "rgb(255,255,0)");
				$div.html( "<div class='letter'>S</div>" );
			}
			if( game.board.terrain[y][x] == 2 ) { //Sun effects
				$div.css( "background-color", "rgb(255,200,200)");
			}
			if( game.board.terrain[y][x] == 3 ) { //Asteroid field
				$div.css( "background-color", "rgb(200,255,200)");
			}
			if( game.board.terrain[y][x] == 4 ) { //Nebula
				$div.css( "background-color", "rgb(200,200,255)");
			}
			
			$div.width( gridSize );
			$div.height( gridSize );
		}
	}
	
	//Planet divs
	$.each( game.board.planets, function( index, planet ) {
		var $div = $('<div class="planet">P</div>');
		$( "#board" ).append( $div );
		
		$div.attr("data-index", index);
		
		$div.css( "left", planet.x*gridSize);
		$div.css( "top", planet.y*gridSize);
		
		$div.width( gridSize );
		$div.height( gridSize );
	});
	
	//Resource stations
	$.each( game.board.resource_stations, function( index, station ) {
		var $div = $('<div class="station">R</div>');
		$( "#board" ).append( $div );
		
		$div.attr("data-index", index);
		
		$div.css( "left", station.x*gridSize);
		$div.css( "top", station.y*gridSize);
		$div.width( gridSize );
		$div.height( gridSize );
	});
	
	add_ships();
	
	//A movement selector has been clicked - the ship should move
	function move_ship() {
		$('.move_selector').remove();
		
		socket.emit("moveship", { index : $( this ).attr("data-ship_index"),
									x : $( this ).attr("data-x"), y : $( this ).attr("data-y")});
	}
	
	//Evaluate current game phase, changing controls to reflect that
	function evaulate_phase() {
		//Clear any excess movement selectors that might still exist
		$('.move_selector').remove();
		$('.deploybutton').remove();
		
		var $div = $('#turn');
		if(me_num == game.currentPlayer) {
			$div.html("<h2>My Turn</h2>");
			if(game.phase == 1) {
				$div.append("<input id='endmovement' type='button' value='End Movement/Combat Phase'/>");
				$('#endmovement').click(function() {
					socket.emit("endmovement", {});
				});
				$('.ship').each(function(index) {
					var ship = game.board.ships[ $( this ).attr("data-index") ];
					var ship_index = $( this ).attr("data-index");
					
					$( this ).click(function() {
						if(!ship.hasmoved && ship.side == me_num && game.currentPlayer == me_num) {
							$('.move_selector').remove();
							var squares = getMoveSquares(Number(ship.x), Number(ship.y), Number(balance[ship.type].Move));
							$.each(squares, function(index, square){
								var $div = $('<div class="move_selector"></div>');
								$( "#board" ).append( $div );
								
								$div.attr("data-ship_index", ship_index);
								$div.attr("data-x", square[0]).attr("data-y", square[1]);
								$div.css( "left", square[0]*gridSize).css( "top", square[1]*gridSize);
								$div.width( gridSize ).height( gridSize );
								
								$div.click(move_ship);
							});
						}
					});
					
				});
			}
			if(game.phase == 2) {
				if(game.board.queue[me_num].length == 0) { //Deploy queue is empty
					socket.emit("enddeploy", {});
				}
				else {
					$div.append("<input id='enddeploy' type='button' value='End Deployment Phase'/>");
					$('#enddeploy').click(function() {
						socket.emit("enddeploy", {});
					});

					update_queue();
				}
			}
			if(game.phase == 3) {
				//Buying ships dialog
				$div.append("<input id='buyships' type='button' value='Buy Ships'/>");
				$('#buyships').click(function() {
					$( "#buyship-dialog" ).dialog({
					  height: 500,
					  width: 500,
					  modal: true
					});
				});

				//Ending the buy phase
				$div.append("<input id='endbuy' type='button' value='End Buy Phase'/>");
				$('#endbuy').click(function() {
					socket.emit("endbuy", {});
				});
			}
		}
		else {
			$div.html("<h2>" + game.players[game.currentPlayer].display_name + "'s Turn</h2>");
		}
	}
	
	color_divs();
	evaulate_phase();
	update_banks();
	update_queue();
	
	socket.on('endmovement', function (data) {
		game.phase = 2;
		evaulate_phase();
	});
	socket.on('enddeploy', function (data) {
		game.phase = 3;
		evaulate_phase();
	});
	socket.on('endbuy', function (data) {
		endturn();
	});
	
	function endturn() {
		game.phase = 1;
		++game.turn;
		if(game.currentPlayer < game.players.length - 1)
			++game.currentPlayer;
		else
			game.currentPlayer = 0;
			
		$.each(game.board.ships, function(index, ship) {
			ship.hasmoved = false;
		});
		
		evaulate_phase();
	}
});



//What to do when a chat message is recieved
function addToChat(data) {
	$( "#chatbox" ).append("<b>" + data.sender + "</b>: " + data.message + "<br>");
}
socket.on('chatmessage', function (data) {
	addToChat(data);
});

$( document ).ready(function() {
	$( "#sendmsg" ).click(function() {
		var data = {sender : me.display_name,
					message : $("#msg").val(),
					date : new Date() };
		
		socket.emit('sendchatmessage', data);
		addToChat(data);
		
		$("#msg").val('');
	});
});