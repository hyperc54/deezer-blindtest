
'use strict';

/**
 * Use this middleware for routes returning a list of resources
 * It will:
 *   1) Define the req.where (conditions found in the query)
 *   2) Define the req.sort (properties to use for sorting and ordering)
 *   3) Define the req.limit (maximum number of resources to return)
 *   4) Define the req.offset (the offset to use for pagination)
 *   5) Call the route's handler (which should return a mongoose.paginate result)
 *   6) Add a Link header for pagination navigation
 *   7) Add a X-Total-Count header with the total amount of resources matching the query (not the amount of returned resources)
 *   8) Update the response's body to only return the documents (see mongoose.paginate's documentation)
 *
 * Examples:
 *   app.get(app.middleware('list')(), function(req, res) { … });
 *   This example will create a 'list' middleware with the default limit values (default: 10, max: 100)
 *
 *   app.get(app.middleware('list')({ default: 20, max: 200 }), function(req, res) { … });
 *   This example will create a 'list' middleware with a default limit of 20 and a maximum limit of 200
 *
 *   app.get(app.middleware('list')({ ignore: 'foo bar' }), function(req, res) { … });
 *   This example will create a 'list' middleware which will ignore 'foo' and 'bar' query parameters for searching conditions
 *
 * @param {number} req.where
 * @param {number} req.sort
 * @param {number} req.limit
 * @param {number} req.offset
 */

const
	mung        = require('express-mung'),
	querystring = require('querystring');

module.exports = function(options) {
	options = options || {};

	const limit = {
		default: options.default || 10,
		max:     options.max     || 100
	};

	// Return a single middleware handling the call of all the asked middlewares
	return function(req, res, next) {
		let   index = -1; // Start with -1 since this index will be incremented directly on the first launch
		const queue = [
			// Middleware used to set the req.where, req.limit and req.offset
			function(req, res, next) {
				// List of query parameters to ignore if present in req.query while preparing the req.where
				const ignore = ['_id', '__v', 'embed', 'fields', 'limit', 'offset', 'sort'].concat((options.ignore || '').split(' '));

				req.where = {};

				// Parse the req.query for req.where conditions
				Object
					.keys(req.query)
					.filter(param => ignore.indexOf(param) < 0)
					.forEach(param => {
						let condition = req.query[param];
						req.where[param] = (condition.push ? condition : [condition]).reduce((previous, current) => {
							let matches;

							/* eslint brace-style: 0 */
							if      (/^~/.test(current))  { previous.$in  = current.substring(1).split(','); }
							else if (/^!~/.test(current)) { previous.$nin = current.substring(2).split(','); }
							else if (/^!/.test(current))  { previous.$ne  = current.substring(1); }
							else if (/^</.test(current))  { previous.$lt  = current.substring(1); }
							else if (/^=</.test(current)) { previous.$lte = current.substring(2); }
							else if (/^>/.test(current))  { previous.$gt  = current.substring(1); }
							else if (/^=>/.test(current)) { previous.$gte = current.substring(2); }
							else if ((matches = /\/(.+)\/(.*)/.exec(current))) { previous.$regex = new RegExp(matches[1], matches[2]); }
							else    { previous.$eq = current; } // Prefer previous.$eq instead of previous since other conditions might be added

							return previous;
						}, {});
					});

				req.sort = (req.query.sort || '').replace(/-?(?:_?id|__v)/g, ''); // Sanitize
				req.sort = req.sort.split(',').filter((value) => !!value).join(' ');

				req.limit  = parseInt(req.query.limit,  10) || limit.default;
				req.offset = parseInt(req.query.offset, 10) || 0;

				req.limit = req.limit < 0         ? limit.default : req.limit;
				req.limit = req.limit > limit.max ? limit.max     : req.limit;

				req.offset = req.offset < 0 ? 0 : req.offset;

				next();
			},

			// Express-mung is a special middleware to modify the response's body
			// It is used to set the Link and X-Total-Count headers and to rewrite the body (which should be a mongoose.paginate result)
			mung.json(function(body, req, res) {
				const query = Object.assign({}, req.query, { limit: req.limit, offset: req.offset });
				let links = {
					first: Object.assign({}, query),
					last:  Object.assign({}, query)
				};

				links.first.offset = 0;
				links.last.offset  = Math.floor(body.total / req.limit) * req.limit;

				// Add the 'prev' link if necessary
				if (req.offset > 0) {
					links.prev = Object.assign({}, query);
					links.prev.offset -= req.limit;
				}

				// Add the 'next' link if necessary
				if (req.offset < links.last.offset) {
					links.next = Object.assign({}, query);
					links.next.offset = req.offset + req.limit;
				}

				// Prepare the links
				links = Object
					.keys(links)
					.map(link => {
						let query = links[link];

						if (query.limit === limit.default) { delete query.limit;  }
						if (query.offset < 1)              { delete query.offset; }

						return '<' + app.locals.root + req.baseUrl + (Object.keys(query).length ? '?' + querystring.stringify(query) : '') + '> rel="' + link + '"';
					});

				res.set('Link', links.join(', '));
				res.set('X-Total-Count', body.total);
				return body.docs;
			})
		];

		// Prepare the callback to use in order to launch the next middleware or 'next'
		(function done() {
			// Increment the index and launch the next middleware, pass this function as callback or 'next' when necessary
			queue[++index](req, res, (queue[index + 1] ? done : next));
		}());
	};
};