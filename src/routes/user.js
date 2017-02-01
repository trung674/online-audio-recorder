// var express = require('express');
import express from 'express';
import Session from '../models/session';
const router = express.Router();

module.exports = (passport) => {
  router.get('/user', isLoggedIn, (req, res) => {
  	res.render('user', {
  		user : req.user // get the user out of session and pass to template
  	});
  });

  router.get('/session', isLoggedIn, (req, res) => {
  	res.render('session');
  });

  router.post('/session', isLoggedIn, (req, res) => {
    console.log(req.body);
  });


  return router;
}

function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/signin');
}
