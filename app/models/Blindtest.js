const
	ObjectId  = mongoose.Schema.Types.ObjectId,
	Blindtest = mongoose.Schema({
		name: String,
		type: {
			type: String,
			enum: ['default', 'flow', 'playlist']
		},
		tracklist: [Number]
	});

Blindtest.plugin(require('mongoose-paginate'));
Blindtest.plugin(require('mongoose-sequence'), { inc_field: 'id' });
Blindtest.set('timestamps', { createdAt: 'created', updatedAt: 'updated' });
Blindtest.set('toJSON', mongoose.Schema.defaults.toJSON);

// Exporting
module.exports = mongoose.model('Blindtest', Blindtest);