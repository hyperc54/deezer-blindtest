const router = express.Router();

// Check if the requested HTTP method is supported 
router.all('/', app.middleware('allowed')('get'));

router.get('/', (req, res) => {
	res.render('Home', {
		data: {
			message: 'bar!'
		},
		vue: {
			components: ['dzrheader', 'dzrtitle', 'dzrfooter']
		}
	});
});

app.use('/', router);
