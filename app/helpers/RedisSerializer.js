/**
 * Serialize an object so it can be stored in Redis and still updated
 * Storing strings is not convenient when you want to increment values or subscribe to changes
 * This function will flatten the object, for example:
 *   { foo: { bar: { awesome: 1 } } }
 * Will become:
 *   { foor.bar.awesome: 1 }
 *
 * @param {object} object The object to serialize
 * @param {string} parent The parent property, used for recursive calls
 * @param {array} raw An array of properties to be JSON stringified instead of flatten
 * @return {object} Return the serialized object
 */
function serialize(object, raw, parent) {
	var
		property, value,
		result = {};

	for (property in object) {
		// Store a JSON.stringified version for "raw" properties
		if ((raw || []).indexOf(property) > -1) {
			result[property] = JSON.stringify(object[property]);
			continue;
		}

		// Ignore some values
		if (object[property] === undefined)                    { continue; } // Don't store undefined values
		if (object[property].call)                             { continue; } // Ignore functions
		if (object[property].push && !object[property].length) { continue; } // Ignore empty array

		// Rewrite value and property, it will be easier
		value    = object[property];
		property = (parent ? parent + "." : "") + property;

		// Objects will be treated differently (store { "foo.bar": 1 } instead of { foo: { bar: 1 } })
		if (value.constructor === Object) {
			extend(result, serialize(value, raw, property)); // Merge the result of the recursive call
		} else {
			result[property] = value; // Otherwise, keep the original value
		}
	}

	return result;
} // end of serialize()

/**
 * Unserialize an object previously serialized using serialize()
 *
 * @param {object} object The object to unserialize
 * @return {object} Return the unserialized object
 */
 /* eslint no-empty:0 */
function unserialize(object) {
	var
		property, current, value,
		result = {};

	for (property in object) {
		current = result; // The current object on which to add the value, will change for nested properties
		value   = object[property]; // Keep the value, we will need it later
		try { value = JSON.parse(value); } catch (e) {} // Try to JSON.parse in order to cast to native types (the Redis client store strings only)

		// For each property found, create a new object if necessary and set the value
		property.split(".").forEach(function(property, index, array) {
			current = current[property] = (index === array.length - 1) ? value : current[property] || {};
		});
	}

	return result;
} // end of unserialize()

module.exports = {
	serialize:   serialize,
	unserialize: unserialize
};