const Probe = function() {}; // FIXME

// Prepare a middleware to set the default and maximum value for req.query.limit
function limit(req, res, next) {
	// Allows for an infinite number of probes for HTML output
	// When using req.accepts(), the order of formats is important (makes sure JSON is first)
	if ((req.params.format || req.accepts(req.params["formats.supported"])) === "html") {
		req.query["limit.default"] = req.query["limit.max"] = Infinity;
	}

	next();
}

// Get a list of probes
app.get("/probes(?:.:format)?", app.middlewares(limit, "limit-offset"), function(req, res) {
	// Using the Redis "KEYS" command is considered bad since it will block the server while querying
	// In this case, since this method shouldn't be called and the number of probes is limited (via TTL) it will be OK
	redis.keys(redis.prefix + Probe.prefix + "*", function(err, probes) {
		res.total = probes.length;
		probes    = probes.slice(req.offset, req.offset + req.limit);

		// Prepare a list of async tasks to retrieve the probes
		var tasks = probes.map(function(key) { return function(cb) { Probe(key.replace(redis.prefix + Probe.prefix, "")).retrieve(cb); }; });

		async.parallel(tasks, function(err, probes) {
			if (err) { return res.status(500).end(); } // TODO
			res.negotiate(probes, "probe");
		});
	});
});

// Get a probe
app.get("/probes/:probe.:format?", function(req, res, next) {
	// Allow to delete using GET (easier for links)
	if (req.query.delete !== undefined) {
		req.method = "DELETE";
		req.url    = "/probes/" + req.params.probe;
		return next();
	}

	Probe(req.params.probe).retrieve(function(err, probe) {
		if (err) { return res.status(500).end(); } // TODO
		res.negotiate(probe, "probe");
	});
});

app.post("/probes",         app.middleware("405")("get", "delete")); // Cannot create a probe
app.post("/probes/:probe",  app.middleware("405")("get", "delete")); // Cannot create a probe here
app.put("/probes",          app.middleware("405")("get", "delete")); // Cannot update all the probes
app.put("/probes/:probe",   app.middleware("405")("get", "delete")); // Cannot update a probe
app.patch("/probes",        app.middleware("405")("get", "delete")); // Cannot partially update all the probes
app.patch("/probes/:probe", app.middleware("405")("get", "delete")); // Cannot partially update a probe

// Delete all the probes
app.delete("/probes", function(req, res) {
	// Using the Redis "KEYS" command is considered bad since it will block the server while querying
	// In this case, since this method shouldn't be called and the number of probes is limited (via TTL) it will be OK
	redis.keys(redis.prefix + Probe.prefix + "*", function(err, keys) {
		var tasks = keys.map(function(key) { return function(cb) { Probe(key.replace(redis.prefix + Probe.prefix, "")).delete(cb); }; });
		async.parallel(tasks, function(err) {
			if (err) { return res.status(500).end(); } // TODO
			res.end();
		});
	});
});

// Delete a probe
app.delete("/probes/:probe", function(req, res) {
	Probe(req.params.probe).delete(function(err, deleted) {
		if (err) { return res.status(500).end(); } // TODO
		res.status(deleted ? 200 : 404).end();
	});
});