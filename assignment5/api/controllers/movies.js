'use strict';
var util = require('util');
var usergrid = require('usergrid');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

module.exports = {
  movieListView: movieListView,
  movieCreate: movieCreate,
  movieDelete: movieDelete
};

var client = new usergrid.client({
    orgName: 'EdSalisbury',
    appName: 'moviedb',
    logging: true
});

function movieListView(req, res) {
    if (req.swagger.params.uuid.value) {
        movieView(req, res)
    } else {
        movieList(req, res)
    }
}

function movieList(req, res) {
    var options = {
        method: 'GET',
        endpoint: 'movies',
        limit: 999
    };

    client.request(options, function (err, data) {
        if (err) {
            res.status(404);
        } else {
            var movies = []

            var url = req.protocol + '://' + req.get('host') + '/assignment5/v1/movies';

            for (var index in data['entities']) {
                var item = data['entities'][index]
                var movie = {'title': item['title'], 'year': item['year'],
                             'actors': item['actors'],
                             'url': url + '?uuid=' + item['uuid']}
                movies.push(movie)
            }
            res.json({count: movies.length, result: movies});
        }
    });
}

function movieView(req, res) {
    var uuid = req.swagger.params.uuid.value;
    var options = {
        endpoint: 'movies',
        type: 'movie',
        uuid: uuid
    };

    client.getEntity(options, function (err, data) {
        if (err) {
            res.status(404).json({message: 'Unable to find movie'});
        } else {
            var url = req.protocol + '://' + req.get('host') + '/assignment5/v1/movies';
            var item = data['_data']
            var movie = {'title': item['title'], 'year': item['year'],
                         'actors': item['actors'],
                         'url': url + '?uuid=' + item['uuid']}

            // If the user wants reviews, retrieve them and add to the view
            if (req.swagger.params.reviews.value) {
                var options = {
                    method: 'GET',
                    type: 'review',
                    endpoint: 'reviews',
                    qs: {ql:"select * where movie_uuid=" + uuid}
                };
                client.request(options, function (err, reviews) {
                    var movieReviews = []
                    for (var index in reviews['entities']) {
                        var review = reviews['entities'][index]

                        var movieReview = {'name': review.name,
                                           'rating': review.rating,
                                           'body': review.body}
                        movieReviews.push(movieReview)
                    }

                    movie['reviews'] = movieReviews;
                    movie['url'] += '\&reviews=true';
                    res.status(200).json({message: movie});
                });
            } else {
                res.status(200).json({message: movie});
            }
        }
    });
}

function movieCreate(req, res) {
    var options = {
        method:'POST',
        type:'movie',
        endpoint:'movies'
    };

    var title = req.swagger.params.title.value;
    var year = req.swagger.params.year.value;
    var actors = req.swagger.params.actors.value;

    client.createEntity(options, function (err, movie) {
        if (err) {
            res.status(500).json({message: 'Unable to create movie'})
        } else {
            // Convert actors to array
            actors = actors.split(',')
            for (var actor in actors)
                actors[actor] = {'name': actors[actor].trim()}

            var data = {
                title: title,
                year: year,
                actors: actors,
            }

            movie.set(data);

            movie.save(function(err) {
                if (err) {
                    res.status(500).json({message: 'Unable to create movie'});
                } else {
                    var url = req.protocol + '://' + req.get('host') + '/assignment5/v1/movies';
                    url = url + '?uuid=' + movie['_data']['uuid'];
                    res.status(201).json({message: 'Movie created', url: url});
                }
            });
        }
    });
}

function movieDelete(req, res) {
    var options = {
        endpoint: 'movies',
        type: 'movie',
        uuid: req.swagger.params.uuid.value
    };

    client.getEntity(options, function(err, movie) {
        if (err) {
            res.status(404).json({message: 'Unable to delete movie'})
        } else {
            movie.destroy(function(err) {
                if (err) {
                    res.status(500).json({message: err})
                } else {
                    res.status(204).json({message: 'Movie deleted'});
                }
            });
        }
    })
}
