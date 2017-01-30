global.io  = io.listen(app.server); // Initialize socket.io

// Listen for client connection to join them in the right room
io.on('connection', socket => {
	socket.on('join', room => socket.join(room));

	socket.on('guess', function(string) {
		const room = socket.rooms[socket.id]; // Marche pas
		if (string === 'Deftones') {
			socket.to(room).emit('global-guess', {
				result: true,
				id: socket.id,
				message: "Machin a trouvé"
			});
			socket.emit('guess', {
				result: true,
				message: "Bien joué"
			});
		} else {
			socket.to(room).emit('global-guess', {
				result: false,
				id: socket.id,
				message: "Machin s'est trompé"
			});
			socket.emit('guess', {
				result: false,
				message: "Boouuhh"
			});
		}
	});
});
