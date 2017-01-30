const
	json = require('../package.json'),
	path = require('path');

// Set the configurations
app.config = {
	// Redis configuration
	redis: {
		host: 'localhost',
		port: 6379,
		prefix: json.name.toLowerCase() + ':'
	},

	// Session configuration
	session: {
		name:   'session',
		secret: 'I love chocolate',

		resave:            false, // See https://github.com/expressjs/session#resave
		saveUninitialized: false, // See https://github.com/expressjs/session#saveuninitialized

		// Session store configuration
		prefix: 'session:',
		ttl:    600
	},

	// Default timeout for socket connections
	timeout: 1000
};

// Set the main directories
app.dir = {
	controllers: path.join(__dirname, 'controllers'),
	core:        path.join(__dirname, 'core'),
	helpers:     path.join(__dirname, 'helpers'),
	middlewares: path.join(__dirname, 'middlewares'),
	models:      path.join(__dirname, 'models'),
	views:       path.join(__dirname, 'views'),

	shared: path.join(__dirname, '../../shared'), // The shared folder must be outside, to avoid removing it when deploying
	public: path.join(__dirname, '../public')
};

// Configure Express
app.set('name',         json.name);
app.set('port',         process.argv[2] || 3000);
app.set('version',      json.version);
app.set('x-powered-by', false);