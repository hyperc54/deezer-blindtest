"use strict";

module.exports = function(session) {
	var Store = session.Store;

	function SessionStore(options) {
		if (!(this instanceof SessionStore)) {
			return new SessionStore(options);
		}

		this.prefix = options.prefix || "session:";
		this.ttl    = options.ttl    || 86400; // TTL from options or one day
	}

	SessionStore.prototype.__proto__ = Store.prototype;

	/**
	 * Retrieve all the sessions from the store
	 *
	 * @param {function} callback The callback to call once the store retrieved all the sessions
	 */
	SessionStore.prototype.all = function(callback) {
		// Using the Redis "KEYS" command is considered bad since it will block the server while querying
		// In this case, since this method shouldn't be called and the number of sessions is limited (via TTL) it will be OK
		redis.keys(redis.prefix + this.prefix + "*", function(err, keys) {
			if (err)          { return callback(err); }
			if (!keys.length) { return callback(null, keys); }

			var multi = redis.multi();
			keys.forEach(function(key) { multi.get(key); });

			multi.exec(function(err, results) {
				if (err) { return callback(err); }
				results = results.map(function(result) { return JSON.parse(result); });
				callback(null, results);
			});
		});
	};

	/**
	 * Destroy a session using its identifier
	 *
	 * @param {string} sid The session identifier
	 * @param {function} callback The callback to call once the store removed the session
	 */
	SessionStore.prototype.destroy = function(sid, callback) {
		redis.del(redis.prefix + this.prefix + sid, callback);
	};

	/**
	 * Destroy all sessions from the store
	 *
	 * @param {function} callback The callback to call once the store cleared the sessions
	 */
	SessionStore.prototype.clear = function(callback) {
		// Using the Redis "KEYS" command is considered bad since it will block the server while querying
		// In this case, since this method shouldn't be called and the number of sessions is limited (via TTL) it will be OK
		redis.keys(redis.prefix + this.prefix + "*", function(err, keys) {
			if (err)          { return callback(err); }
			if (!keys.length) { return callback(null); }
			keys.push(callback);
			redis.del.apply(redis, keys);
		});
	};

	/**
	 * Count the number of sessions in the store
	 *
	 * @param {function} callback The callback to call once the store counted the sessions
	 */
	SessionStore.prototype.length = function(callback) {
		// Using the Redis "KEYS" command is considered bad since it will block the server while querying
		// In this case, since this method shouldn't be called and the number of sessions is limited (via TTL) it will be OK
		redis.keys(redis.prefix + this.prefix + "*", function(err, keys) {
			callback(err, keys.length);
		});
	};

	/**
	 * Retrieve a session using its identifier
	 *
	 * @param {string} sid The session identifier
	 * @param {function} callback The callback to call once the store retrieved the session
	 */
	SessionStore.prototype.get = function(sid, callback) {
		redis.get(redis.prefix + this.prefix + sid, function(err, session) {
			if (err)      { return callback(err); }
			if (!session) { return callback(null, null); }
			callback(null, JSON.parse(session));
		});
	};

	/**
	 * Save the given session in Redis and MongoDB
	 *
	 * @param {string} sid The session identifier
	 * @param {Session} session The session object
	 * @param {function} callback The callback to call once the store saved the session
	 */
	SessionStore.prototype.set = function(sid, session, callback) {
		redis
			.multi()
			.set(redis.prefix + this.prefix + sid, JSON.stringify(session), callback)
			.expire(redis.prefix + this.prefix + sid, this.ttl)
			.exec();
	};

	/**
	 * Reset the TTL of the session to its initial value
	 *
	 * @param {string} sid The session identifier
	 * @param {Session} session The session object
	 * @param {function} callback The callback to call once the store "touched" the session
	 */
	SessionStore.prototype.touch = function(sid, session, callback) {
		redis.expire(redis.prefix + this.prefix + sid, this.ttl, callback);
	};

	return SessionStore;
};