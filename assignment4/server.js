// CSC3800 Web API
// Assignment #4
// 2015/04/11 Ed Salisbury

// Set up express
var express = require('express');
var usergrid = require('usergrid');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Set the port
var port = process.env.PORT || 4242;

// Set up routes
var router = express.Router();

var client = new usergrid.client({
    orgName: 'EdSalisbury',
    appName: 'moviedb',
    logging: true
});

// Log all requests
router.use(function(req, res, next) {
    console.log(req.method + ' ' + req.url);
    next();
});

router.route('/movies')
.get(function(req, res) {
    var options = {
        method:'GET',
        endpoint:'movies',
        limit: 999
    };

    client.request(options, function (err, data)
    {
        if (err)
        {
            res.status(404);
        }
        else
        {
            var movies = []
            var url = req.protocol + '://' + req.get('host');
            for (var index in data['entities'])
            {
                item = data['entities'][index]
                movie = {'title': item['title'], 'year': item['year'],
                         'actors': item['actors'], 'url': url + item['metadata']['path']}
                movies.push(movie)
            }
            res.json({count: movies.length, result: movies});
        }
    });
})
.post(function(req, res) {
    var options = {
        method:'POST',
        type:'movie',
        endpoint:'movies'
    };

    client.createEntity(options, function (err, movie) {
        if (err)
        {
            res.status(500).json({result: 'Unable to create movie'})
        }
        else
        {
            var data = {
                title: req.body.title,
                year: '',
                actor1: '',
                actor2: '',
                actor3: ''
            }

            movie.set(data);

            movie.save(function(err){
                if (err)
                {
                    res.status(500).json({result: 'Unable to create movie'});
                }
                else
                {
                    res.status(201).json({result: 'Movie created'});
                }
            });
        }
    });
});

// /posts
router.route('/movies/:uuid')
.get(function(req, res) {
    var options = {
        endpoint: 'movies',
        type: 'movie',
        uuid: req.params.uuid
    };

    client.getEntity(options, function (err, data)
    {
        if (err)
        {
            res.status(404);
        }
        else
        {
            var url = req.protocol + '://' + req.get('host');
            var item = data['_data']
            movie = {'title': item['title'], 'year': item['year'],
                     'actors': item['actors'], 'url': url + item['metadata']['path']}
            res.json({result: movie});
        }
    });
})
.delete(function(req, res) {
    var options = {
        endpoint: 'movies',
        type: 'movie',
        uuid: req.params.uuid
    };
    client.getEntity(options, function(err, movie)
    {
        if (err)
        {
            res.status(404).json({result: 'Unable to delete movie'})
        }
        else
        {
            movie.destroy(function(err) {
                if (err)
                {
                    res.status(500).json({'message': err})
                }
                else
                {
                    res.status(204).json({result: 'Movie deleted'});
                }
            });
        }
    })
});



// // /posts
// router.route('/posts')
// .post(function(req, res) {
//     res.json({message: 'POST request accepted', query: req.query});
// })
// .all(function(req, res) {
//     res.status(405).json({message: 'Unsupported HTTP method'});
// });

// // /puts
// router.route('/puts')
// .put(function(req, res) {
//     res.json({message: 'PUT request accepted', query: req.query});
// })
// .all(function(req, res) {
//     res.status(405).json({message: 'Unsupported HTTP method'});
// });

// // /deletes
// router.route('/deletes')
// .delete(function(req, res) {
//     res.json({message: 'DELETE request accepted', query: req.query});
// })
// .all(function(req, res) {
//     res.status(405).json({message: 'Unsupported HTTP method'});
// });

// Register the routes
app.use('/', router);

// Reject anything else
app.all('*', function(req, res) {
    res.status(404).send('Invalid URN specified');
});

// Start the server
app.listen(port);
console.log('Starting server on port ' + port);
