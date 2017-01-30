const
	json = require('../package.json'),
	path = require('path');

// Set the configurations
app.config = {
	// MongoDB configuration
	mongodb: {
		uri: `mongodb://localhost:27017/${json.name.toLowerCase()}`
	},

	// Redis configuration
	redis: {
		host: 'localhost',
		port: 6379,
		prefix: `${json.name.toLowerCase()}:`
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
app.set('etag',         false);
app.set('name',         json.name);
app.set('port',         process.argv[2] || 3000);
app.set('version',      json.version);
app.set('view engine', 'vue');
app.set('views',        app.dir.views);
app.set('x-powered-by', false);

// Define the static middleware
app.use(express.static(app.dir.public));

// Set the rendering engines
app.engine('vue', require('express-vue'));

// Use a middleware to retrieve the hostname (doesn't have to configure)
app.use((req, res, next) => {
	app.locals.root = app.locals.root || `${req.protocol}://${req.get('Host')}`;
	next();
});

// Configure request with some defaults
global.request = request.defaults({
	timeout: app.config.timeout,
	headers: {
		Accept: '*/*', // Accept anything, some servers might need an Accept header and request doesn't set one by default
		'User-Agent': `${app.get('name')}/${app.get('version')}`
	}
});