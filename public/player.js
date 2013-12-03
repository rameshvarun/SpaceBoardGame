//Constants
var player_colors = ["#27ADE3", "#B0D136", "#EE368A"];
var gridSize = 10;
var model_height = 5;
var RESOURCE_URL = "http://www.varunramesh.net/spaceboardgame/";//"http://localhost/";

var scroll_margin_x = 0.1;
var scroll_margin_y = 0.2;

//Helper function
function clamp(value, low, high) {
	if(value < low) return low;
	if(value > high) return high;
	return value;
}

function randInt(min, max) {
	return Math.floor( Math.random() * (max - min + 1) ) + min;
}

var me = null;
var game = null;
var me_num = 0;

$(function() {
	//Start to connect the socket to the server
	var socket = io.connect(APP_URL);

	//Styling chat window
	var chatwindow_bottom = $("#chatwindow_bar").height()*2 - $("#chatwindow").height();
	$("#chatwindow").css("bottom",  chatwindow_bottom );

	//Minimize/maximize chat window
	$(".glyphicon-chevron-up").toggle(function() {
		$("#chatwindow").animate( { bottom : 0 }, 500 );
		$(".glyphicon-chevron-up").addClass("glyphicon-chevron-down").removeClass("glyphicon-chevron-up");
	},
	function() {
		$("#chatwindow").animate( { bottom : chatwindow_bottom }, 500 );
		$(".glyphicon-chevron-down").addClass("glyphicon-chevron-up").removeClass("glyphicon-chevron-down");
	});

	//Chat window functions
	function addToChat(data) {
		$( "#chatwindow_chats" ).append("<b>" + data.sender + "</b>: " + data.message + "<br>");
		$( "#chatwindow_chats" ).animate({ scrollTop: $( "#chatwindow_chats" )[0].scrollHeight}, 100);
	}
	$("#chatwindow_message").keyup(function(event) {
		if(event.which == 13) {
			var data = {sender : me.display_name,
					message : $(this).val(),
					date : new Date() };

			socket.emit('sendchatmessage', data);
			addToChat(data);
			$(this).val("");
		}
	});
	socket.on('chatmessage', function (data) {
		addToChat(data);
		(new Audio( RESOURCE_URL + "audio/chat.wav")).play(); //Play notification sound
	});



	socket.emit('setuser', { usertoken : USERTOKEN }); //Tell server the current user
	
	socket.on('userinfo', function (data) { //After recieving user information, set the current game id
		me = data;
		socket.emit('setgame', { gameid :  GAMEID }); 
	});

	socket.on('game', function (data) { //Game data is recieved
		game = data;

		//Populate chat history
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

		//Set-up 3d Scene
		setupGame();
	});
});

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
var clock = new THREE.Clock();



var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;


document.body.appendChild( renderer.domElement );

//Post processing
var composer = new THREE.EffectComposer( renderer );

var postIntensity = 0.7;

var renderModel = new THREE.RenderPass( scene, camera );
var effectBloom = new THREE.BloomPass( 1.25*postIntensity );
var effectFilm = new THREE.FilmPass( 0.35*postIntensity, 0.95*postIntensity, 2048, false );
effectFilm.renderToScreen = true;

composer.addPass( renderModel );
composer.addPass( effectBloom );
composer.addPass( effectFilm );

var onUpdate = [];

var time = 0.0;
function render() {
	requestAnimationFrame(render);
	//renderer.render(scene, camera);

	var dt = clock.getDelta();
	time += dt;
	
	renderer.clear();
	composer.render( dt );
	
	onUpdate.forEach(function(callback) {
		callback(dt, time);
	});

	if(mouse_x < scroll_margin_x) focus_x -= dt*zoom;
	if(mouse_x > 1.0 - scroll_margin_x) focus_x += dt*zoom;
	if(mouse_y < scroll_margin_y) focus_y -= dt*zoom;
	if(mouse_y > 1.0 - scroll_margin_y) focus_y += dt*zoom;

	focus_x = clamp(focus_x, 0, game ? game.board.terrain[0].length*gridSize : 0);
	focus_y = clamp(focus_y, 0, game ? game.board.terrain.length*gridSize : 0);

	camera.position.z = focus_y + gridSize*2;
	camera.position.x = focus_x;
	camera.position.y = zoom;
	camera.lookAt( new THREE.Vector3( focus_x, model_height, focus_y) );
}
render();

//Handles when the window is resized
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	
	composer.reset();
}
window.addEventListener( 'resize', onWindowResize, false );

//Asynchronously load lava and vertex shader, bug occurs if this doesn't happen in time before the sun loads
var lava_vert = "";
var lava_frag = "";
$.get( RESOURCE_URL + "gfx/shaders/lava.vert", function( data ) { lava_vert = data; });
$.get( RESOURCE_URL + "gfx/shaders/lava.frag", function( data ) { lava_frag = data; });


function setupGame() {
	//Start background music
	var bgm = new Audio(RESOURCE_URL + 'audio/searching.mp3');
	bgm.loop = true;
	bgm.play();
	
	//Add in lighting
	var directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.position.set(1, 1, 1).normalize();
	scene.add(directionalLight);
	// add subtle blue ambient lighting
	//var ambientLight = new THREE.AmbientLight(0x000044);
	//scene.add(ambientLight);
	
	//Create space grid
	var material = new THREE.LineBasicMaterial( { color: 0xFFFFFF, opacity: 0.2 } );

	var width = game.board.terrain[0].length;
	var height = game.board.terrain.length;

	//Set camera to center of grid
	focus_x = (width/2) * gridSize;
	focus_y = (height/2) * gridSize;

	for ( var i = 0; i <= width; i++ ) {
		var geometry = new THREE.Geometry();
		geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( 0, 0, i*gridSize ) ) );
		geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( height*gridSize, 0, i*gridSize ) ) );

		var line = new THREE.Line( geometry, material );
		scene.add( line );
	}
	for ( var j = 0; j <= height; j++ ) {
		var geometry = new THREE.Geometry();
		geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( j*gridSize, 0, 0 ) ) );
		geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( j*gridSize, 0, width*gridSize ) ) );

		var line = new THREE.Line( geometry, material );
		scene.add( line );
	}
	

	var star = THREE.ImageUtils.loadTexture( RESOURCE_URL + "gfx/textures/star.png" );
	var star_colors = ['cyan', 'white', 'pink']
	for(var n = 0; n < star_colors.length; ++n) {
		var geometry = new THREE.Geometry();
		
		for ( var i = 0; i < (height*width)/star_colors.length; i++ ) {
			var lateral_margin = 200;
			var vertical_margin = 100;
			
			var vertex = new THREE.Vector3();
			vertex.x = randInt(-lateral_margin, width*gridSize + lateral_margin);
			vertex.z = randInt(-lateral_margin, height*gridSize + lateral_margin);
			vertex.y = randInt(-vertical_margin, vertical_margin);
			
			geometry.vertices.push( vertex );
		}
		
		var material = new THREE.ParticleSystemMaterial( { size: 15, sizeAttenuation: false, map: star, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false } );
		material.color.set( star_colors[n] );
		
		var particles = new THREE.ParticleSystem( geometry, material );
		particles.sortParticles = true;
		scene.add( particles );
	}
	
	//Create space skybox
	var geometry  = new THREE.SphereGeometry(9000, 32, 32);
	var material  = new THREE.MeshBasicMaterial();
	material.map   = THREE.ImageUtils.loadTexture( RESOURCE_URL + 'gfx/textures/bluegalaxy.jpg');
	material.side  = THREE.BackSide;
	var mesh  = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	var lava_uniforms = {
		fogDensity: { type: "f", value: 0 },
		fogColor: { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) },
		time: { type: "f", value: 1.0 },
		resolution: { type: "v2", value: new THREE.Vector2() },
		uvScale: { type: "v2", value: new THREE.Vector2( 3.0, 1.0 ) },
		texture1: { type: "t", value: THREE.ImageUtils.loadTexture( RESOURCE_URL + "gfx/textures/cloud.png" ) },
		texture2: { type: "t", value: THREE.ImageUtils.loadTexture( RESOURCE_URL + "gfx/textures/lavatile.jpg" ) }
	};
	lava_uniforms.texture1.value.wrapS = lava_uniforms.texture1.value.wrapT = THREE.RepeatWrapping;
	lava_uniforms.texture2.value.wrapS = lava_uniforms.texture2.value.wrapT = THREE.RepeatWrapping;
	
	onUpdate.push(function(dt, time) { //Animate lava shader
		lava_uniforms.time.value += dt;
	});

	lava_material = new THREE.ShaderMaterial( {
		uniforms: lava_uniforms,
		vertexShader: lava_vert,
		fragmentShader: lava_frag
	});
	
	//Load in terrain
	for ( var x = 0; x < width; x++ ) {
		for ( var y = 0; y < height; y++ ) {

			var i = game.board.terrain[y][x];

			console.log(i);
			if(i == 1) {
				var sun_mesh = new THREE.Mesh( new THREE.SphereGeometry(gridSize*0.5*0.9, 32, 32), lava_material );
				sun_mesh.position.x = (x + 0.5)*gridSize;
				sun_mesh.position.z = (y + 0.5)*gridSize;

				sun_mesh.position.y = model_height;
				scene.add( sun_mesh );
				
				//Atmosphere around sun
				var geometry = sun_mesh.geometry.clone();
				var corona_material = THREEx.createAtmosphereMaterial();
				corona_material.side = THREE.BackSide;
				
				corona_material.uniforms.coeficient.value = 0.5;
				corona_material.uniforms.power.value = 4.0;
				corona_material.uniforms.glowColor.value.set('yellow');
				var mesh = new THREE.Mesh(geometry, corona_material );
				mesh.position.x = (x + 0.5)*gridSize;
				mesh.position.z = (y + 0.5)*gridSize;
				mesh.position.y = model_height;
				mesh.scale.multiplyScalar(1.15);
				scene.add( mesh );
				
				//Animate sun
				onUpdate.push(function(dt, time) {
					viewDirection = camera.position.clone().sub(sun_mesh.position).normalize(); //Update atmosphere shader
					corona_material.uniforms.viewDirection.value = viewDirection;
				});
			}
			if(i == 1 || i == 2) {
				var material = new THREE.LineBasicMaterial( { color: 0xFF0000, opacity: 0.3, transparent: true } );

				var mesh = new THREE.Mesh( new THREE.PlaneGeometry(gridSize, gridSize), material );
				mesh.position.x = (x + 0.5)*gridSize;
				mesh.position.z = (y + 0.5)*gridSize;

				mesh.rotation.x = -Math.PI/2;
				scene.add( mesh );
			}
			if(i == 3) {
				var material = new THREE.LineBasicMaterial( { color: 0xC0C0C0, opacity: 0.3, transparent: true } );

				var mesh = new THREE.Mesh( new THREE.PlaneGeometry(gridSize, gridSize), material );
				mesh.position.x = (x + 0.5)*gridSize;
				mesh.position.z = (y + 0.5)*gridSize;

				mesh.rotation.x = -Math.PI/2;
				scene.add( mesh );
			}
			if(i == 4) {
				var material = new THREE.LineBasicMaterial( { color: 0x0000FF, opacity: 0.3, transparent: true } );

				var mesh = new THREE.Mesh( new THREE.PlaneGeometry(gridSize, gridSize), material );
				mesh.position.x = (x + 0.5)*gridSize;
				mesh.position.z = (y + 0.5)*gridSize;

				mesh.rotation.x = -Math.PI/2;
				scene.add( mesh );
			}
		}
	}
	
	//Load in planets
	$.each( game.board.planets, function( index, planet ) {
		//Physical planet
		var mesh = THREEx.Planets.createPlanet( {
			size : gridSize*0.5*0.9,
			color : RESOURCE_URL + 'gfx/textures/planets/color1.jpg',
			bump : RESOURCE_URL + 'gfx/textures/planets/bump1.jpg',
			specular : RESOURCE_URL + 'gfx/textures/planets/spec1.jpg'
		});
		
		mesh.position.x = (planet.x + 0.5)*gridSize;
		mesh.position.z = (planet.y + 0.5)*gridSize;
		
		planet.mesh = mesh;
		scene.add(mesh);
		
		//Cloud cover
		var mesh = THREEx.Planets.createClouds( {
			size : gridSize*0.5*0.9 + 0.05,
			color : RESOURCE_URL + 'gfx/textures/planets/cloudcolor1.jpg',
			transparency : RESOURCE_URL + 'gfx/textures/planets/cloudtrans1.jpg'
		} );
		mesh.position.x = (planet.x + 0.5)*gridSize;
		mesh.position.z = (planet.y + 0.5)*gridSize;
		planet.clouds = mesh;
		scene.add(mesh);
		
		//Atmosphere around planets
		var geometry = mesh.geometry.clone();
		var material = THREEx.createAtmosphereMaterial();
		material.side = THREE.BackSide;
		
		material.uniforms.coeficient.value = 0.5;
		material.uniforms.power.value = 4.0;
		material.uniforms.glowColor.value.set(0x00b3ff);
		var mesh = new THREE.Mesh(geometry, material );
		mesh.position.x = (planet.x + 0.5)*gridSize;
		mesh.position.z = (planet.y + 0.5)*gridSize;
		mesh.scale.multiplyScalar(1.1);
		
		planet.atmosphere_material = material;
		scene.add( mesh );
		
		//Animate planet
		onUpdate.push(function(dt, time) {
			planet.mesh.rotation.y += dt*0.1; //Planet rotates
			planet.clouds.rotation.y += dt*0.2; //Planet clouds moving
						
			viewDirection = camera.position.clone().sub(planet.mesh.position).normalize(); //Update atmosphere shader
			planet.atmosphere_material.uniforms.viewDirection.value = viewDirection;
		});
	});
}

//Camera controls
var focus_x, focus_y;
var zoom = 100;
var mouse_x = 0;
var mouse_y = 0;
function MouseWheelHandler(e) {
	var e = window.event || e;
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

	zoom -= delta*3;
	if(zoom < 19) zoom = 19;
	if(zoom > 85) zoom = 85;
}
function MouseMoveHandler(e) {
	mouse_x = e.pageX / $(this).width();
	mouse_y = e.pageY / $(this).height();
}

//Bind event handlers
renderer.domElement.addEventListener("mousewheel", MouseWheelHandler, false);
renderer.domElement.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
$(renderer.domElement).mousemove(MouseMoveHandler);
$(renderer.domElement).mouseleave(function() {
	mouse_x = 0.5;
	mouse_y = 0.5;
});