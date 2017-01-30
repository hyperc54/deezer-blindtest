
'use strict';

/**
 * Retrieve the fields to select while returning some resources
 *
 * req.fields will have a special 'select' function which allows you to return the fields to select
 * req.fields will also have a 'populate' function which allows you to return the list of options for population
 *
 * req.fields.select('Memory') will return the fields to select for a 'Memory' resource.
 * Mongoose will handle nested fields (e.g. geo.accuracy.vertical) but won't automatically populate (e.g. owner.uuid)
 * Using req.fields.select will return the fields to use for a mongoose's 'select' method (e.g. 'geo.accuracy.vertical owner')
 *
 * Then, use req.fields.populate('Memory') to return the options to use for population.
 * Since mongoose cannot handle automatic population of nested fields, prepare an array of options (e.g [{ path: 'owner', select: 'uuid' }])
 *
 * Examples:
 *   /?fields=foo,bar
 *   This example will select only the 'foo' and 'bar' properties
 *
 *   /?fields=foo.bar
 *   This example will select only the 'bar' property from the 'foo' sub-document
 *
 *   /?fields=-foo
 *   This example will select all the properties, except 'foo'
 *   Please note it is not possible to ask for inclusion and exclusion (e.g. -foo,bar)
 *
 *   /?fields=owner.*
 *   This exemple will embed a owner resource instead of the owner's id
 *
 *   /?fields=foo,owner.bar
 *   It is possible to select nested fields, this example will return the 'foo' property of the resource
 *   and the 'bar' property of the 'owner' resource.
 *
 * Known limitations:
 *   - It is impossible to include and exlude fields at the same time
 *   - It is impossible to exclude fields from an embed
 *   - If there is an embed, it is no longer possible to exclude fields (embedding require inclusion)
 *
 * @param {object} req.fields
 */

const prototype = {
	/**
	 * Get the list of populate options
	 *
	 * @example
	 *   req.fields.populate('Memory')
	 *   Will return [undefined] if req.query.fields doesn't include 'owner' (the populate is not necessary)
	 *   Will return [{ path: 'owner' }] if req.query.fields includes 'owner.*'
	 *   Will return [{ path: 'owner', select: 'foo bar'] if req.query.fields includes 'owner.foo,owner.bar'
	 *
	 * @param {string} model The model name. It will be used to find the embeddable fields.
	 * @return {array}
	 */
	populate: function(model) {
		const
			references = app.model(model).schema.references,
			embeddable = Object.keys(references);

		return Object
			.keys(this)
			.filter(path => embeddable.indexOf(path) > -1) // Keep only embeddable paths
			.map(path => {
				const
					output = { path, model: references[path] },
					select = this[path].select(output.model);

				if (!select)               { return; } // An embeddable path is present in the URL but nothing is explicitely selected, avoid populating it
				if (!select.includes('*')) { output.select = select; } // Add the explicit 'select', by default all the fields will be selected

				// Check if we need to populate recursively
				if (Object.keys(this[path]).length) {
					const populate = this[path].populate(output.model);
					if (populate.length) { output.populate = populate; }
				}

				return output;
			})
			.filter(embed => !!embed); // Do not return a sparse array
	},

	/**
	 * Retrieve the list of fields to select
	 *
	 * @example
	 *   req.fields.select('Memory')
	 *   Will return the requested fields, but will filter for nested fields requesting a 'populate' first
	 *
	 * @param {string} model The model name. It will be used to find the embeddable fields.
	 * @return {string} Return a dot-notation of the fields to select
	 */
	select: function(model) {
		const
			// Get a list of properties that might be embeddable
			// This is useful to filter nested path
			// Example (using mongoose): select('foo.bar') won't return anything,
			//   we have to use select('foo') and populate({ path: 'foo', select: 'bar' })
			embeddable = Object.keys(app.model(model).schema.references),

			// Filter the current object (used to retrieve the fields to select in the populate, see above)
			// With JSON.stringify it is easier to recursively walk through the whole object
			filtered = JSON.parse(JSON.stringify(this, function(key, value) {
				if (key && embeddable.indexOf(key) > -1) { return 1; } // If the key is an embeddable, simply return 1
				if (Object.keys(value).length === 0)     { return 1; } // If the value is an empty object (meaning the end of parsed path, see below), simply return 1
				return value; // Otherwise, return the value (if it is an object it will be passed to stringify again)
			}));

		// Serialize an object to generate paths
		// For example, passing { foo: { bar: 1 }, baz: 1 } will return 'foo.bar baz'
		function serialize(object, prefix) {
			let output = [], property, prefixed;

			for (property in object) {
				prefixed = prefix ? prefix + '.' + property : property; // The prefixed property (used for recursive calls)
				output.push(object[property] === 1 ? prefixed : serialize(object[property], prefixed)); // Either append to the output or call recursively
			}

			return output
				.filter(field => !!field)
				.join(' ');
		}

		return serialize(filtered);
	}
};

module.exports = function(req, res, next) {
	req.fields = Object.create(prototype);

	// Parse the fields to have an object of properties (easier for nested fields)
	(req.query.fields || '')
		.split(',')
		.forEach(field => {
			field
				.split('.')
				.reduce((previous, current) => previous[current] = previous[current] || Object.create(prototype), req.fields);
		});

	next();
};