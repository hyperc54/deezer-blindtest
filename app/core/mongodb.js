global.mongoose = require('mongoose');
global.mongoose.Promise = global.Promise;

// Prepare some default options for Schema
global.mongoose.Schema.defaults = {
	toJSON: {
		// Add a default transform to remove the internal _id and __v that shouldn't be exposed
		transform: function(doc, json) {
			delete json._id;
			delete json.__v;

			// Convert dates to timestamps
			for (let property in json) {
				if (json[property] instanceof Date) { json[property] = json[property].getTime(); }
			}

			return json;
		}
	}
};

/**
 * Add a 'references' getter property on the Schema's prototype
 * @return {object} Return an object of references (key) and model's name (value) (e.g. { owner: 'User' })
 */
Object.defineProperty(mongoose.Schema.prototype, 'references', {
	get: function() {
		const output = {};

		Object
			.keys(this.tree)
			.forEach(field => {
				const reference = this.tree[field].push ? this.tree[field][0].ref : this.tree[field].ref;
				if (reference) { output[field] = reference; }
			});

		return output;
	}
});

/* eslint no-console:0, no-process-exit:0 */
module.exports = function(callback) {
	const config = app.config.mongodb;

	// Crash on error since the MongoDB link is mandatory
	mongoose.connection.on('error', err => {
		console.error(`✗ Could not connect to MongoDB (${config.uri})`);
		console.error(err);
		process.exit(1);
	});

	// When the link is opened, simply continue the flow
	mongoose.connection.once('open', () => {
		console.log(`✓ Connected to MongoDB (${config.uri})`);
		return callback();
	});

	// Once the listeners are ready, try to connect
	mongoose.connect(config.uri);
};