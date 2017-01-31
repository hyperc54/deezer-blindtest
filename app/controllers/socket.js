const fetch = require('node-fetch');

global.io = io.listen(app.server); // Initialize socket.io
global.blindtests = {};

console.log('Blindtest global state', global.blindtests);

const DURATION = 30 * 1000;
const INTERVAL = 1000;
const WAITING  = 5 * 1000;

function loop() {
	const now = Date.now();
	for (let room in global.blindtests) {
		const blindtest = global.blindtests[room];

		if (blindtest.state === 'ready' || (now > blindtest.started && blindtest.state === 'waiting')) {
			console.log('Blindtest is', blindtest.state, 'launching it now');
			blindtest.started = Date.now();
			blindtest.state = 'started';
			const {id, md5} = blindtest.tracklist[blindtest.index];
			io.to(room).emit('StartTrackMessage', {id, md5});
			continue;
		}

		if (now > blindtest.started + DURATION) {
			console.log('Finished:', blindtest.json.title);
			const old = blindtest.tracklist[blindtest.index];
			blindtest.index = Math.round(Math.random() * blindtest.tracklist.length);
			blindtest.state = 'waiting';
			blindtest.started = now + WAITING;
			const track = blindtest.tracklist[blindtest.index];
			track.md5 = track.preview.replace(/^.+([a-f0-9]{32}).+/, '$1');
			io.to(room).emit('EndOfTrackMessage', {
				answer: {
					artist: old.artist.name,
					album: old.album.title,
					track: old.title,
					cover: old.album.cover_big
				},
				scores: [],
				nextTrack: {
					id: track.id,
					md5: track.md5
				}
			});
		}
	}

	setTimeout(loop, INTERVAL);
}

function Blindtest(identifier) {
	console.log('Creating a new Blindtest with identifier', identifier);
	const blindtest = this;
	this.scores = {};
	this.tracklist = [];
	this.players = [];
	this.state = 'requesting';

	console.log('Requesting', 'http://api.deezer.com/' + identifier);
	fetch('http://api.deezer.com/' + identifier)
		.then(response => {
			if (!response.ok) {
				console.error('errored');
				blindtest.state = 'errored';
				return;
			}

			response.json().then(data => {
				blindtest.json = data;
				blindtest.tracklist = data.tracks.data;
				console.log('Found', blindtest.tracklist.length, 'tracks');
				blindtest.index = Math.round(Math.random() * blindtest.tracklist.length);
				blindtest.state = 'ready';
			});
		});
} // End of Blindtest()

setTimeout(loop, INTERVAL);

// Listen for client connection to join them in the right room
io.on('connection', socket => {
	console.log('Connection received from socket', socket.id);
	socket.on('join', (room, data = {}) => {
		console.log(`Joined the room ${room}`);
		socket.join(room);

		const blindtest = global.blindtests[room] || (global.blindtests[room] = new Blindtest(room));
		let player = blindtest.players.filter(player => player.id === data.id || 0);

		if (!player.length) {
			const {id, name, avatarUrl} = data;
			player = {id, name, avatarUrl, socket: socket.id};
			blindtest.players.push(player);
		} else {
			player = player[0];
		}

		socket.emit('NewPlayerMessage', {
			room: {
				name: blindtest.json ? blindtest.json.title : 'Playlist',
				type: 2,
				mode: 1
			},
			timeRemaining: DURATION - (Date.now() - blindtest.started),
			players: blindtest.players
		});

		socket.to(room).emit('NewPlayerBroadcast', player);
	});

	socket.on('leave', room => {
		const blindtest = global.blindtests[room];
		const player = blindtest.players.filter(player => player.socket === socket.id);

		if (!player.length) { return; }

		const {id, name, avatarUrl} = player[0];
		blindtests.players.splice(blindtests.players.indexOf(player[0]), 1);
		socket.to(room).emit('PlayerLeaveBroadcast', {id, name, avatarUrl});
	});

	socket.on('ClientGuessMessage', value => {
		const blindtest = global.blindtests[value.room];
		const player = blindtest.players.filter(player => player.socket === socket.id);
		if (!blindtest) { return; }

		const track = blindtest.tracklist[blindtest.index];
		const guess = String(value.guess).toLowerCase();
		const answer = (track.artist.name || '').toLowerCase();
		console.log(guess, 'against', answer);
		if (answer === guess) {
			socket.emit('ServerGoodAnswerMessage', {newScore: 0}); // TODO
			socket.to(value.room).emit('ServerGoodAnswerBroadcast', {id: player[0].id});
		} else {
			socket.emit('ServerBadAnswerMessage', {
				guess: value.guess,
				message: "You sucks!"
			});

			socket.to(value.room).emit('ServerBadAnswerBroadcast', {
				id: player[0].id,
				message: player[0].name + 'thought it was' + value.guess + '! Shame on him!'
			});
		}
	});
});
