#!/usr/bin/env node
/* eslint-disable no-console */

// Log the node version and PID, it might be useful for sysadmin
console.log(`★ Node ${process.version} (PID: ${process.pid})`);

const path = require('path');

// Set globals
global.express = require('express');
global.app     = express();
global.async   = require('async');
global.io      = require('socket.io');
global.request = require('request');

// Configure the app
require(path.join(__dirname, 'app/config.js')); // Load the configuration
require(path.join(app.dir.core, 'patch'));      // Quickly patch the application to ease the development

// Set some global middlewares
app.use(app.middlewares("cors compression"));

// Launch the application after having checked some mandatory middlewares
async.series(
	[
		require(path.join(app.dir.core, 'mongodb')), // Initialize the MongoDB link
	],
	function() {
		// Load the controllers
		app.controller('home');
		app.controller('blindtests');

		// In production, automatically handle 404 and errors
		if (app.get('env') === 'production') {
			app.use(app.middleware('404')); // If no controller could handle this request, use this middleware
			// TODO: Add an error handler middleware
		}

		// Finally launch the application
		app.server = app.listen(app.get('port'));
		app.controller('socket');

		console.log(`✓ ${app.get('name')} v${app.get('version')} running on http://localhost:${app.get('port')} (${app.get('env')})`);
		console.log('😄  (Ctrl + C to exit)\n');

		// Listen for the 'close' event on the http.Server to shutdown gracefully
		app.server.on('close', () => {
			console.log('⏏ Shutting down');
			console.log('😘');
			mongoose.connection.close();
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