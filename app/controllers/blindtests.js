const
	Blindtest = app.model('Blindtest'),
	router = express.Router();

// Check if the requested HTTP method is supported 
router.all('/', app.middleware('allowed')('get', 'post'), app.middleware('fields'));

// Get a list of blindtests
router.get('/', app.middleware('list')(), (req, res) => {
	const options = {
		limit:  req.limit,
		offset: req.offset,
		select: req.fields.select('Blindtest'),
		sort:   req.sort
	};

	Blindtest
		.paginate(req.where, options)
		.then(blindtests => res.send(blindtests))
		.catch(error => res.send(error)); // FIXME
});

// Create a blindtest
router.post('/', app.middleware('body-parser'), (req, res) => {
	new Blindtest(req.body)
		.save()
		.then(blindtest => res.status(201).set('Location', `${app.locals.root}${req.baseUrl}/${blindtest.id}`).send(blindtest))
		.catch(error => res.send(error)); // FIXME
});

// Cannot update all the blindtests
// Cannot partially update all the blindtests
// Cannot delete all the blindtests

// Check if the requested HTTP method is supported
router.all('/:blindtest', app.middleware('allowed')('get', 'put', 'patch', 'delete'), app.middleware('fields'));

// Get a blindtest
router.get('/:blindtest', (req, res) => {
	Blindtest
		.findOne({ id: req.params.blindtest })
		.select(req.fields.select('Blindtest'))
		.then(blindtest => blindtest ? res.send(blindtest) : res.status(404).end())
		.catch(error => res.send(error)); // FIXME
});

// Cannot create a blindtest here

// Update a blindtest
router.put('/:blindtest', function(req, res) {
	res.send('PUT /blindtests/:blindtest (TODO)');
});

// Partially update a blindtest
router.patch('/:blindtest', function(req, res) {
	res.send('PATCH /blindtests/:blindtest (TODO)');
});

// Delete a blindtest
router.delete('/:blindtest', function(req, res) {
	Blindtest
		.remove({ id: req.params.blindtest })
		.then(action => res.status(action.result.n ? 204 : 404).end())
		.then(function(action) { return res.status(action.result.n ? 204 : 404).end(); })
		.catch(error => res.send(error)); // FIXME
});

app.use('/blindtests', router);
