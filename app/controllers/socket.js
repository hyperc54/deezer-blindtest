global.io  = io.listen(app.server); // Initialize socket.io

global.timers = {};

function interval(duration, fn){
  this.baseline = undefined

  this.run = function(){
    if(this.baseline === undefined){
      this.baseline = new Date().getTime()
    }
    fn()
    var end = new Date().getTime()
    this.baseline += duration

    var nextTick = duration - (end - this.baseline)
    if(nextTick<0){
      nextTick = 0
    }
    (function(i){
        i.timer = setTimeout(function(){
        i.run(end)
      }, nextTick)
    }(this))
  }
}

// Listen for client connection to join them in the right room
io.on('connection', socket => {

	let startTrackEmission = () => {
		const message = {
			room: {
				id: 123,
			},
			state: 2,
			track: 136889434,
			countDown: 20
		};
		console.log(message);
		socket.broadcast.emit('StartTrackMessage', message);
	}

	//const timer = new interval(20000, startTrackEmission);
	//timer.run();

	socket.on('blindtest', function(resp){
		console.log(resp);
	})

	socket.on('join', room => {
		global.timers[room] = global.timers[room] || setInterval(function() {
			console.log('Track done for room', room);
			socket.to(room).emit('track-ended');
		}, 30000);

		socket.join(room);
	});

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
