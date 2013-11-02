var app = angular.module('app', []);
app.config(function($interpolateProvider) {
  $interpolateProvider.startSymbol('//');
  $interpolateProvider.endSymbol('//');
});


var me = null;
var root = null;
$( document ).ready(function() {
	root = angular.element('#app-container').scope()
	
	root.getProperties = function(array, property) {
		var props = $.map(array, function(val, i) {
			return val[property]
		});
		return props;
	}
	
	root.friends = [];
	root.recievedinvites = [];
	root.sentinvites = [];
	
	root.yourturn = [];
	root.theirturn = [];
	
	//Get information about the user
	$.getJSON("/data?action=me", function(data) {
		me = data;
		console.log("Successfully obtained user data.");
	});
	
	//Button for challenging a friend
	function challenge_friend() {
		var url = "/invite?action=create&users=" + $( this ).attr('data-friendid');
		$.getJSON(url, function(data) {
			sentinvites_refresh();
		});
		$( "#newgame-dialog" ).dialog("close");
	}
	
	//Reject invite button
	function reject_invite() {
		var url = "/invite?action=decline&inviteid=" + $( this ).attr('data-inviteid');
		$.getJSON(url, function(data) {
			sentinvites_refresh();
			recievedinvites_refresh();
		});
	}
	
	//Accept invite button
	function accept_invite() {
		var url = "/invite?action=accept&inviteid=" + $( this ).attr('data-inviteid');
		$.getJSON(url, function(data) {
			recievedinvites_refresh();
			games_refresh();
		});
	}

	function friends_refresh() {
		$.getJSON( '/data?action=friends', function(data) {
			root.friends = data;
			root.$apply();
			$( ".challenge_friend" ).click( challenge_friend );
		});
	}
	
	function sentinvites_refresh() {
		$.getJSON( '/data?action=sentinvites', function(data) {
			root.sentinvites = data;
			root.$apply();
			$( ".reject-invite" ).click( reject_invite );
		});
	}
	
	function recievedinvites_refresh() {
		$.getJSON( '/data?action=recievedinvites', function(data) {
			root.recievedinvites = data;
			root.$apply();
			$( ".reject-invite" ).click( reject_invite );
			$( ".accept-invite" ).click( accept_invite );
		});
	}
	
	function games_refresh() {
		$.getJSON( '/data?action=games', function(data) {
			root.yourturn = [];
			root.theirturn = [];
			
			$.each(data, function( index, game ) {
				if( game.players[game.currentPlayer]._id == me._id)
					root.yourturn.push(game);
				else
					root.theirturn.push(game);
			});
			
			root.$apply();
		});
	}
	
	function refresh() {
		friends_refresh();
		sentinvites_refresh();
		recievedinvites_refresh();
		games_refresh();
	}
	
	$( "#newgame" ).click(function() {
		$(function() {
			$( "#newgame-dialog" ).dialog({
			  height: 140,
			  modal: true
			});
		});
	});
	
	refresh();
	setInterval(refresh, 10000); //Refresh every 10 seconds
});