const socket = io();

socket.on('connect', function() {
	const room = Number(window.location.pathname.replace(/\/blindtests\/(\d+)\/?/, '$1'));
	if (room) {
		socket.emit('join', room);
	}
});