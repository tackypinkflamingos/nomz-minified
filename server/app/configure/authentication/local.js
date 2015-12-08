'use strict';
var passport = require('passport');
var _ = require('lodash');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

module.exports = function (app) {

    // When passport.authenticate('local') is used, this function will receive
    // the email and password to run the actual authentication logic.
    var strategyFn = function (email, password, done) {
        User.findOne({ email: email }).select('+password +salt')
            .then(function (user) {
                // user.correctPassword is a method from the User schema.
                if (!user || !user.correctPassword(password)) {
                    done(null, false);
                } else {
                    // Properly authenticated.
                    done(null, user);
                }
            }, function (err) {
                done(err);
            });
    };

    passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, strategyFn));

    // A POST /login route is created to handle login.
    app.post('/login', function (req, res, next) {
        var authCb = function (err, user) {
            if (err) return next(err);

            if (!user) {
                var error = new Error('Invalid login credentials.');
                error.status = 401;
                return next(error);
            }

            // req.logIn will establish our session.
            req.logIn(user, function (loginErr) {
                if (loginErr) return next(loginErr);
                // We respond with a response object that has user with _id and email.
                res.status(200).send({
                    user: _.omit(user.toJSON(), ['password', 'salt'])
                });
            });

        };

        passport.authenticate('local', authCb)(req, res, next);

    });

    // Check for username or email conflicts
    app.post('/signup', function(req, res, next) {
        User.findOne({
            $or: [
                { email: req.body.email},
                { username: req.body.username}
            ]
        }).then( user => {
            if (user && user.email === req.body.email) {
                var error = new Error('Email is already taken')
                error.status = 409
                throw error
            }
            else if (user && user.username === req.body.username) {
                var error = new Error('username is already taken')
                error.status = 409
                throw error
            } else {
                return User.create({
                    email: req.body.email,
                    password: req.body.password,
                    username: req.body.username
                })
            }
        }).then( user => {
            // TODO: Refactor to automatically login the user
            // login the user and send appropriate response
            res.sendStatus(201);
            
        }).then(null, next)
    })


};
