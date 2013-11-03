//Connect to the server
var socket = io.connect(APP_URL);

socket.emit('setuser', { usertoken : USERTOKEN }); //Tell server the current user

var player_colors = ["#27ADE3", "#B0D136", "#EE368A"];

var me = null;
var game = null;
var me_num = 0;
socket.on('userinfo', function (data) {
	me = data;
	
	//After recieving user information, set the current game id
	socket.emit('setgame', { gameid :  GAMEID }); 
});

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
});

function getMoveSquares(startx, starty, range) {
	squares = [];
	function squareTested(xval, yval) {
		for(var n = 0; n < squares.length; ++n) {
			if( squares[n][0] == xval && squares[n][1] == yval) {
				return true;
			}
		}
		return false;
	}
	
	function recursiveMove(x, y, order) {
		if(order <= 0)
			return;
		
		if(x < 0 || y < 0)
			return;
			
		if(x >= game.board.terrain[0].length || y >= game.board.terrain.length)
			return;
			
		for(var i = 0; i < game.board.planets.length; ++i) {
			if(x == game.board.planets[i].x && y == game.board.planets[i].y) {
				return;
			}
		}
		for(var i = 0; i < game.board.ships.length; ++i) {
			if(x == game.board.ships[i].x && y == game.board.ships[i].y) {
				return;
			}
		}
		
		if( !squareTested(x, y) )
			squares.push([x,y]);
			
		for(var i = -1; i <= 1; ++i) {
			for(var j = -1; j <= 1; ++j) {
				if( !(i == 0 && j == 0) ) {
					recursiveMove(x + i, y + j, order - 1);
				}
			}
		}
	}
	
	for(var i = startx - 1; i <= startx + 1; ++i) {
		for(var j = starty - 1; j <= starty + 1; ++j) {
			if( !(i == startx && j == starty) ) {
				recursiveMove(i, j, range);
			}
		}
	}
	
	return squares;
}

var gridSize = 50;
socket.on('game', function (data) {
	game = data;
	
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
	
	//Add ship divs
	$.each( game.board.ships, function( index, ship ) {
		var $div = $('<div class="ship"></div>');
		
		$div.attr("data-index", index);
		
		$( "#board" ).append( $div );
		$div.html( ship.type[0].toUpperCase() + ship.type[1] );
		
		$div.css( "left", ship.x*gridSize);
		$div.css( "top", ship.y*gridSize);
		$div.width( gridSize );
		$div.height( gridSize );
	});
	
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
	
	function move_ship() {
		$('.move_selector').remove();
		var ship_index = $( this ).attr("data-ship_index");
		var ship = game.board.ships[ship_index];
		ship.hasmoved = true;
		
		ship.x = $( this ).attr("data-x");
		ship.y = $( this ).attr("data-y");
		
		var $ship = null;
		$(".ship").each(function(index) {
			if($( this ).attr('data-index') == ship_index) {
				$ship = $( this );
			}
		});

		$ship.animate( {left : (ship.x)*gridSize,
						top : (ship.y)*gridSize}, 1000 );
						
		socket.emit("moveship", { index : ship_index, x : ship.x, y : ship.y});
	}
	
	function evaulate_phase() {
		var $div = $('#turn');
		if(me_num == game.currentPlayer) {
			$div.html("<h2>My Turn</h2>");
			if(game.phase == 1) {
				$end_movement = $div.append("<input type='button' value='End Movement/Combat Phase'/>");
				$end_movement.click(function() {
					game.phase = 2;
					socket.emit("endmovement", {});
					evaulate_phase();
				});
				$('.ship').each(function(index) {
					var ship = game.board.ships[ $( this ).attr("data-index") ];
					var ship_index = $( this ).attr("data-index");
					
					$( this ).click(function() {
						if(!ship.hasmoved && ship.side == me_num) {
							$('.move_selector').remove();
							var squares = getMoveSquares(ship.x, ship.y, balance[ship.type].Move);
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
					game.phase = 3;
					socket.emit("enddeploy", {});
					evaulate_phase();
				}
				else {
				}
			}
			if(game.phase == 3) {
				//Skip store
				socket.emit("endbuy", {});
				endturn();
			}
		}
		else {
			$div.html("<h2>" + game.players[game.currentPlayer].display_name + "'s Turn</h2>");
		}
	}
	
	color_divs();
	evaulate_phase();
	
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