const socket = io();
let room;

socket.on('connect', function() {
	room = Number(window.location.pathname.replace(/\/blindtests\/(\d+)\/?/, '$1'));
	if (room) {
		socket.emit('join', room);
	}
});

socket.on('global-guess', function(result) {
	console.log('Global guess', result);
});

socket.on('guess', function(result) {
	console.log('Result', result);
});

window.foo = function() {
	socket.emit('guess', 'Deftones');
}