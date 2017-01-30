#!/usr/bin/env node
/* eslint-disable no-console */

// Log the node version and PID, it might be useful for sysadmin
console.log(`★ Node ${process.version} (PID: ${process.pid})`);

const path = require('path');

// Set globals
global.app     = require('express')();
global.async   = require('async');
global.io      = require('socket.io');

// Configure the app
require(path.join(__dirname, 'app/config.js')); // Load the configuration
require(path.join(app.dir.core, 'patch'));      // Quickly patch the application to ease the development

// Launch the application after having checked some mandatory middlewares
async.series(
	[
		require(path.join(app.dir.core, 'redis')), // Initialize the Redis link
	],
	function() {
		// Load the controllers
		app.controller('blindtests');

		// In production, automatically handle 404 and errors
		if (app.get('env') === 'production') {
			app.use(app.middleware('404')); // If no controller could handle this request, use this middleware
			// TODO: Add an error handler middleware
		}

		// Finally launch the application
		app.server = app.listen(app.get('port'));
		global.io  = io.listen(app.server); // Initialize socket.io

		// Listen for client connection to join them in the right room
		io.on('connection', socket => {
			socket.on('join', room => socket.join(room));
		});

		console.log(`✓ ${app.get('name')} v${app.get('version')} running on http://localhost:${app.get('port')} (${app.get('env')})`);
		console.log('😄  (Ctrl + C to exit)\n');

		// Listen for the 'close' event on the http.Server to shutdown gracefully
		app.server.on('close', () => {
			console.log('⏏ Shutting down');
			console.log('😘');
			redis.quit();
		});

		function shutdown() {
			app.server.close(process.exit); // Close all opened connections
			setTimeout(process.exit, app.get('env') === 'production' ? 10000 : 500); // Set a 10s timeout to exit anyway
		}

		// Listen for SIGTERM and SIGINT, log the signal (for debug) and shutdown properly
		process.on('SIGTERM', () => { console.log('Received SIGTERM'); shutdown(); });
		process.on('SIGINT',  () => { console.log(' Received SIGINT'); shutdown(); });
	}
);