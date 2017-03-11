// var express = require('express');
import express from 'express';
import Recording from '../models/recording';
import User from '../models/user';
import moment from 'moment';
const router = express.Router();

module.exports = (passport) => {
  router.get('/user', isLoggedIn, (req, res) => {
    let newRecordings, ongoingRecordings, finishedRecordings
    Recording.find().limit(10) //should limit to newest 5 sessions
      .then((recordings) => {
        User.findOne({_id: req.user._id}).populate({path: 'records._recording'})
          .then((user) => {
            // Find new recordings that have not started by user yet
            let userRecordIds = user.records.map((record) => record._recording._id);
            newRecordings = recordings.filter((recording) => {
              return (userRecordIds.some(id => id.equals(recording._id)) == false);
            });
            // Find recordings that have been started but not finished by user
            finishedRecordings = user.records.filter((record) => {
              return record.isFinished == true;
            });

            // Find recordings that have been finished by user
            ongoingRecordings = user.records.filter((record) => {
              return record.isFinished == false;
            });

            // Render page with necessary information
            res.render('user/user', {
                newRecordings : newRecordings,
                ongoingRecordings : ongoingRecordings,
                finishedRecordings : finishedRecordings,
                user : req.user,
                moment : moment
            });
          })
          .catch(err => {
            console.log(err);
            next();
          });
      })
      .catch(err => {
        console.log(err);
        next();
      });
  });

  router.get('/user/session/:recording', isLoggedIn, (req, res, next) => {
    Recording.findOne({_id: req.params.recording})
      .then((recording) => {
        let userRecords = findExistingSession(req.user.records, req.params.recording);
        let recordingStatus

        if (userRecords.length == 0) {
          recordingStatus = 'start';
        } else if (userRecords[0].isFinished == false) {
          recordingStatus = 'ongoing';
        } else if (userRecords[0].isFinished == true) {
          recordingStatus = 'finished';
        }

        res.render('session/session', {
          recording : recording,
          recordingStatus : recordingStatus,
          moment : moment,
        });
      })
      .catch(err => {
        console.log(err);
        next();
      });
  });

  router.get('/user/session/:recording/:index', isLoggedIn, (req, res, next) => {
    Recording.findOne({_id: req.params.recording})
      .then((recording) => {
        User.findOne({_id : req.user._id})
          .then((user) => {
            let userRecords = findExistingSession(user.records, recording._id);
            if (userRecords.length == 0) {
              let record = {_recording: recording._id, path: 'uploads/' + req.user.username + '/' + recording._id, isFinished: false, lastVisited: Date.now()};
              console.log(record);
              user.records.push(record);
              user.save((err) => {
                if (err) {
                  console.error(err);
                  next();
                }
              });
              // User.update(
              //   user,
              //   {$push: {"records": {_recording: recording._id, path: 'uploads/' + req.user.username + '/' + recording._id, isFinished: false, lastVisited: Date.now() }}},
              //   (err) => {
              //     if (err) {
              //       console.log(err);
              //       next();
              //     }
              //   });
            }
          })
          .then(() => {
            let viewTemplate;
            if (recording.type == 'paragraph' || recording.type == 'speech') {
              viewTemplate = 'session/record_session_2';
            } else {
              viewTemplate = 'session/record_session';
            }
            res.render(viewTemplate, {
                username: req.user.username,
                recording : recording,
                reqIndex : req.params.index,
                moment : moment,
            });
          })
          .catch(err => {
            console.log(err);
            next();
          });
      })
      .catch(err => {
        console.log(err);
        next();
      });
  });

  return router;
}


function findExistingSession(records, id) {
  let filter = records.filter((record) => record._recording == id);
  return filter;
}

function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/signin');
}
