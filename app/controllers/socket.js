global.io  = io.listen(app.server); // Initialize socket.io

global.timers = {};

// timer.run();
// Listen for client connection to join them in the right room
io.on('connection', socket => {
  console.log('Somebody joined us');

	socket.on('join', room => {
  	const message = {
  		room: {
  			id: 123,
  		},
  		state: 2,
  		track: 136889434,
  		countDown: 20
  	};
		socket.join(room);

		global.timers[room] = global.timers[room] || setInterval(function() {
			socket.to(room).emit('EndOfTrackMessage', 'END '+new Date());
      setTimeout(() => {
  			socket.to(room).emit('StartTrackMessage', message);
      }, 5000)
		}, 10000);

	});

	socket.on('ClientGuessMessage', function(string) {
    console.log(string);
		// const room = socket.rooms[socket.id]; // Marche pas
		// if (string === 'Deftones') {
		// 	socket.to(room).emit('global-guess', {
		// 		result: true,
		// 		id: socket.id,
		// 		message: "Machin a trouvé"
		// 	});
		// 	socket.emit('guess', {
		// 		result: true,
		// 		message: "Bien joué"
		// 	});
		// } else {
		// 	socket.to(room).emit('global-guess', {
		// 		result: false,
		// 		id: socket.id,
		// 		message: "Machin s'est trompé"
		// 	});
		// 	socket.emit('guess', {
		// 		result: false,
		// 		message: "Boouuhh"
		// 	});
		// }
	});
});
