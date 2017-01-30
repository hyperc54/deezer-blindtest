const redis = require('redis');

/* eslint-disable no-console, no-process-exit */
module.exports = function(callback) {
	const
		config = app.config.redis,
		client = redis.createClient(config.port, config.host);

	// Crash on error since the Redis link is mandatory
	client.on('error', err => {
		console.error(`✗ Could not connect to Redis (${config.host}:${config.port})`);
		console.error(err);
		process.exit(1);
	});

	// When the link is opened, simply continue the flow
	client.once('ready', () => {
		console.log(`✓ Connected to Redis (${config.host}:${config.port})`);
		client.prefix   = config.prefix; // Set a prefix to use before each query, to avoid polluting
		client.notifier = redis.createClient(config.port, config.host); // Create another client for pub/sub
		global.redis    = client; // Set the link as global so it will be easily usable throughout the application
		return callback();
	});
};