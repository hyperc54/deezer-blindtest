const fetch = require('node-fetch');
const Levenshtein = require('levenshtein');

global.io = io.listen(app.server); // Initialize socket.io
global.blindtests = {};

global.messages = {
    good: [
        'Well done buddy',
        'There you go, %d point!',
        'Very good indeed!',
        'Awe — wait for it — some!',
        'Yeah baby!'
    ],
    bad: [
        'Ugh? Really?',
        'Is that even a real name?',
        'Nope',
        'Are you serious?',
        'Not quite'
    ],
    broadcast: [
        '%g? Ugh? Really? %s',
        '%g? Are you serious %s?',
        '%g? Not quite %s'
    ]
};

const DURATION = 30 * 1000;
const INTERVAL = 1000;
const WAITING = 5 * 1000;

function loop() {
    const now = Date.now();
    for (let room in global.blindtests) {
        const blindtest = global.blindtests[room];

        if (blindtest.state === 'ready' || (now > blindtest.started && blindtest.state === 'waiting')) {
            console.log('Blindtest is', blindtest.state, 'launching it now');
            blindtest.started = Date.now();
            blindtest.state = 'started';
            const track = blindtest.tracklist[blindtest.index];
            track.scores = [];
            const {id, md5} = track;
            blindtest.artistFound = false;
            blindtest.trackFound = false;
            blindtest.whoFoundArtist = new Set();
            blindtest.whoFoundTrack = new Set();
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
            if (track.hasOwnProperty('preview')) {
                track.md5 = track.preview.replace(/^.+([a-f0-9]{32}).+/, '$1');
            } else {
                track.md5 = '';
            }

            const scores = old.scores.sort((a, b) => a.score < b.score);

            io.to(room).emit('EndOfTrackMessage', {
                answer: {
                    id: old.id,
                    artist: old.artist.name,
                    album: old.album.title,
                    track: old.title,
                    cover: old.album.cover_big
                },
                scores,
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
    this.artistFound = false;
    this.trackFound = false;
    this.whoFoundArtist = new Set();
    this.whoFoundTrack = new Set();

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
    socket.on('disconnect', function () {
        for (let room in global.blindtests) {
            const blindtest = global.blindtests[room];
            const player = blindtest.players.filter(player => player.socket === socket.id);

            if (!player.length) {
                continue;
            }

            const {id, name, avatarUrl, score} = player[0];
            blindtest.players.splice(blindtest.players.indexOf(player[0]), 1);
            socket.to(room).emit('PlayerLeaveBroadcast', {id, name, avatarUrl, score});
        }
    });

    console.log('Connection received from socket', socket.id);
    socket.on('join', (room, data = {}) => {
        if (!data) {
            return;
        }
        console.log(`Joined the room ${room}`);
        socket.join(room);

        const blindtest = global.blindtests[room] || (global.blindtests[room] = new Blindtest(room));
        let player = blindtest.players.filter(player => player.id === data.id || 0);

        if (!player.length) {
            if (data) {
                const {id, name, avatarUrl} = data;
                player = {id, name, avatarUrl, score: 0, socket: socket.id};
                blindtest.players.push(player);
            } else {
                socket.emit('NewPlayerError', {error: 'Error while adding user to the room'});
            }
        } else {
            player = player[0];
        }

        socket.emit('NewPlayerMessage', {
            room: {
                name: blindtest.json ? blindtest.json.title : 'Playlist',
                type: 2,
                mode: 1
            },
            timeRemaining: DURATION - (Date.now() - (blindtest.started || 0)),
            players: blindtest.players
        });

        socket.to(room).emit('NewPlayerBroadcast', blindtest.players);
    });

    socket.on('ClientGuessMessage', value => {
        const blindtest = global.blindtests[value.room];
        if (!blindtest) {
            return;
        }

        const player = blindtest.players.filter(player => player.socket === socket.id);
        if (!player.length) {
            return;
        }

        const track = blindtest.tracklist[blindtest.index];
        let guess = String(value.guess).toLowerCase();
        let artistAnswer = (track.artist.name || '').toLowerCase();
        let trackAnswer = (track.title_short || '').toLowerCase();
        console.log('Guess attempt from', player[0].name , guess, 'against', artistAnswer, '|', trackAnswer);

        artistAnswer = artistAnswer.replace('\(.*\)', '');
        trackAnswer = trackAnswer.replace('\(.*\)', '');
        guess = guess.replace('\(.*\)', '');
        let artistFound = Levenshtein(artistAnswer, guess) <= Math.round(0.2 * artistAnswer.length)
        let trackFound = Levenshtein(trackAnswer, guess) <= Math.round(0.2 * trackAnswer.length)
        const playerId = player[0].id;
        if (artistFound || trackFound) {
            if (artistFound) {
                if (blindtest.whoFoundArtist.has(playerId)) {
                    socket.emit('AlreadyAnsweredArtistMessage', {message: 'You\'ve already found the artist !'});
                    return;
                }
                player[0].score++;
                blindtest.whoFoundArtist.add(player[0].id)
            } else if (trackFound) {
                if (blindtest.whoFoundTrack.has(playerId)) {
                    socket.emit('AlreadyAnsweredTrackMessage', {message: 'You\'ve already found this song\'s name !'});
                    return;
                }
                player[0].score += 2;
                blindtest.whoFoundTrack.add(player[0].id)
            }
            if (!blindtest.artistFound) {
                player[0].score++;
                blindtest.artistFound = true;
            } else if (!blindtest.trackFound) {
                player[0].score++;
                blindtest.trackFound = true;
            }
            track.scores.push(player[0]);
            socket.emit('ServerGoodAnswerMessage', {
                message: global.messages.good[Math.floor(Math.random() * global.messages.good.length)].replace('%d', 1),
                newScore: player[0].score
            });
            socket.to(value.room).emit('ServerGoodAnswerBroadcast', {
                id: player[0].id,
                newScore: player[0].score
            });
        } else {
            socket.emit('ServerBadAnswerMessage', {
                guess: value.guess,
                message: global.messages.bad[Math.floor(Math.random() * global.messages.bad.length)]
            });

            socket.to(value.room).emit('ServerBadAnswerBroadcast', {
                id: player[0].id,
                message: global.messages.broadcast[Math.floor(Math.random() * global.messages.broadcast.length)].replace('%g', value.guess)
            });
        }
    });
});
