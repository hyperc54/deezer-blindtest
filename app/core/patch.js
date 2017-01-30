/**
 * This is a simple facade function to make the code cleaner
 * The function just require the controller file
 *
 * @param {string} name The name of the controller to load
 * @return {*} The return of the require function
 */
app.controller = name => require(app.dir.controllers + '/' + name.toLowerCase())

/**
 * This is a simple facade function to make the code cleaner
 * The function just require the helper file
 *
 * @param {string} name The name of the helper to load
 * @return {*} The return of the require function
 */
app.helper = name => require(app.dir.helpers + '/' + name)

/**
 * This is a simple facade function to make the code cleaner
 * The function just require the middleware file
 *
 * @param {string} name The name of the middleware to load
 * @return {*} The return of the require function
 */
app.middleware = name => require(app.dir.middlewares + "/" + name.toLowerCase())

/**
 * This function create a middleware which will call multiple middlewares
 * This function can be called with multiple arguments (e.g. app.middleware("foo", bar, "baz qux"))
 *
 * @param {string|function} names Either The names of the middlewares to call (space separated) or a middleware function
 * @return {function} The middleware in charge of calling all the requested middlewares
 */
app.middlewares = () => {
	var args = Array.prototype.slice.call(arguments);

	// Return a single middleware handling the call of all the asked middlewares
	return function(req, res, next) {
		var
			index = -1, // Start with -1 since this index will be incremented directly on the first launch
			queue = [];

		// Prepare the queue of middlewares to launch
		args.forEach(function(argument) {
			if (argument.call) { return queue.push(argument); }
			argument.split(" ").forEach(function(name) {
				queue.push(app.middleware(name));
			});
		});

		// Prepare the callback to use in order to launch the next middleware or "next"
		(function done() {
			// Increment the index and launch the next middleware, pass this function as callback or "next" when necessary
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
app.model = name => app.models[name] || (app.models[name] = require(app.dir.models + "/" + name))