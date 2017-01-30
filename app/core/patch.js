/**
 * This is a simple facade function to make the code cleaner
 * The function just require the controller file
 *
 * @param {string} name The name of the controller to load
 * @return {*} The return of the require function
 */
app.controller = name => require(`${app.dir.controllers}/${name.toLowerCase()}`)

/**
 * This is a simple facade function to make the code cleaner
 * The function just require the helper file
 *
 * @param {string} name The name of the helper to load
 * @return {*} The return of the require function
 */
app.helper = name => require(`${app.dir.helpers}/${name}`)

/**
 * This is a simple facade function to make the code cleaner
 * The function just require the middleware file
 *
 * @param {string} name The name of the middleware to load
 * @return {*} The return of the require function
 */
app.middleware = name => require(`${app.dir.middlewares}/${name.toLowerCase()}`)

/**
 * This function create a middleware which will call multiple middlewares
 * This function can be called with multiple arguments (e.g. app.middleware('foo', bar, 'baz qux'))
 *
 * @param {string|function} names Either The names of the middlewares to call (space separated) or a middleware function
 * @return {function} The middleware in charge of calling all the requested middlewares
 */
app.middlewares = function() {
	var args = Array.prototype.slice.call(arguments);

	// Return a single middleware handling the call of all the asked middlewares
	return function(req, res, next) {
		var
			index = -1, // Start with -1 since this index will be incremented directly on the first launch
			queue = [];

		// Prepare the queue of middlewares to launch
		args.forEach(function(argument) {
			if (argument.call) { return queue.push(argument); }
			argument.split(' ').forEach(function(name) {
				queue.push(app.middleware(name));
			});
		});

		// Prepare the callback to use in order to launch the next middleware or 'next'
		(function done() {
			// Increment the index and launch the next middleware, pass this function as callback or 'next' when necessary
			queue[++index](req, res, (queue[index + 1] ? done : next));
		}());
	};
};

app.models = {}; // The models cache

/**
 * Create a "model" function used to retrieve an existing model or initialize it
 * This function is useful to avoid re-declaring model (which mongoose doesn't allow)
 *
 * @param {string} name The name of the model to retrieve
 * @return {Mongoose.Model} The mongoose model
 */
app.model = name => app.models[name] || (app.models[name] = require(`${app.dir.models}/${name}`))

/**
 * Add a middleware to augment (just once) the response's prototype with a "negotiate" method
 * This method will send the given output based on the Accept HTTP header or a format provided in the URL
 */
app.use(function(req, res, next) {
	if (!res.constructor.prototype.negotiate) {
		// A RegExp used to retrieve the format from the request's URL
		var rFormat = /\.(html|json)$/i;

		res.constructor.prototype.negotiate = function(output, template) {
			var
				format    = this.req.params.format,
				supported = this.req.params["formats.supported"],
				url, limit, offset, links,

				// The matching list of supported extensions and their associated MIME type (avoid using the "mime" module since it is overkill and difficult to match the "vast" extension)
				mimes = {
					html:  "text/html",
					json:  "application/json"
				},

				// Prepare the list for the content-negociation (prefers using MIME type instead of shortcut like "html")
				negotiation = {
					// "application/json" should appears first since it is the default output (when the client accept multiple MIME types)
					"application/json":       function() { this.json(output); }.bind(this),
					"text/html":              function() { this.render(template, output); }.bind(this),
					default:                  function() { this.status(406).send("Not Acceptable"); }.bind(this)
				};

			// Try to retrieve the format in the URL if the router couldn't find one
			if (!format) {
				format = this.req.path.match(rFormat);
				format = format ? format[1] : format;
			}

			// Check if we have a format restriction list
			if (supported) {
				if (format) {
					format = supported.indexOf(format) === -1 ? "unsupported" : format;
				} else {
					// Get the MIME associated to the formats
					supported = supported.map(function(format) { return mimes[format]; });

					// Filter the "negotiation" object
					Object.keys(negotiation).forEach(function(mime) {
						if (mime === "default") { return; } // Always keep the "default"
						if (supported.indexOf(mime) === -1) { delete negotiation[mime]; }
					});
				}
			}

			// Set some a Link header if we can paginate through this resource
			if (this.req.limit) {
				url    = app.locals.root + this.req.path,
				limit  = this.req.limit !== this.req.query["limit.default"] ? this.req.limit : null, // Add a "limit" parameter only if we asked for a non-default limit
				offset = {
					first: !this.req.offset ? null : 0, // Add the "first" link only if there is an offset (otherwise, we are on the first "page")
					prev:  !this.req.offset ? null : this.req.offset - this.req.limit, // Same as above
					next:  this.req.offset + this.req.limit,
					last:  null // Set the "last" link only if we have a "total" and can compute the last
				};

				if (this.total) {
					offset.next = offset.next < this.total ? offset.next : null; // Remove the "next" link if there is no next
					offset.last = Math.floor(this.total / this.req.limit) * this.req.limit; // Compute the "last" link
					offset.last = offset.last === this.total ? offset.last - this.req.limit : offset.last; // Makes sure the "last" link won't point to an empty list
					offset.prev = this.req.offset <= offset.last ? offset.prev : null; // Remove the "prev" link if the offset if more than the last (last "page")
					offset.last = offset.last ? offset.last : null; // Remove the "last" link if there is only one "page"
					this.setHeader("X-Total-Count", this.total); // Don't forget to set a specific header for the total
				}

				links = Object.keys(offset).reduce(function(previous, current) {
					if (offset[current] === null || offset[current] === Infinity) { return previous; } // Don't set a link if the offset is invalid

					// Prepare the parameters
					var parameters = { offset: offset[current], limit: limit };
					parameters = Object.keys(parameters)
						.filter(function(parameter) { return parameters[parameter] > 0; }) // Keep only parameters have a value superior than 0
						.map(function(parameter)    { return parameter + "=" + parameters[parameter]; })
						.join("&");

					// Write the link (<http://foo.bar/things?offset=x&limit=y>; rel="prev")
					return previous + (previous ? ",\n" : "") + "<" + url + (parameters ? "?" + parameters : "") + ">; rel=\"" + current + "\"";
				}, "");

				if (links) { this.setHeader("Link", links); }
			}

			// Specifying a format will force the output to this format, otherwise use content-negotiation
			format ? negotiation[mimes[format] || "default"]() : this.format(negotiation);
		};
	}

	next();
});
