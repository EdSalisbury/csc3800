// CSC3800 Web API
// Assignment #2
// 2015/02/28 Ed Salisbury

// Set up express
var express = require('express');
var app = express();

// Set the port
var port = process.env.PORT || 4242;

// Set up routes
var router = express.Router();

// Log all requests
router.use(function(req, res, next) {
    console.log(req.method + ' ' + req.url);
    next();
});

// /gets
router.route('/gets')
.get(function(req, res) {
    res.json({message: 'GET request accepted', query: req.query});
})
.all(function(req, res) {
    res.status(405).json({message: 'Unsupported HTTP method'});
});

// /posts
router.route('/posts')
.post(function(req, res) {
    res.json({message: 'POST request accepted', query: req.query});
})
.all(function(req, res) {
    res.status(405).json({message: 'Unsupported HTTP method'});
});

// /puts
router.route('/puts')
.put(function(req, res) {
    res.json({message: 'PUT request accepted', query: req.query});
})
.all(function(req, res) {
    res.status(405).json({message: 'Unsupported HTTP method'});
});

// /deletes
router.route('/deletes')
.delete(function(req, res) {
    res.json({message: 'DELETE request accepted', query: req.query});
})
.all(function(req, res) {
    res.status(405).json({message: 'Unsupported HTTP method'});
});

// Register the routes
app.use('/', router);

// Reject anything else
app.all('*', function(req, res) {
    res.status(404).send('Invalid URN specified');
});

// Start the server
app.listen(port);
console.log('Starting server on port ' + port);
