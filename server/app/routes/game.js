'use strict';
var router = require('express').Router();
var _ = require('lodash');
var fsHelper = require('./foursquare-helper');
var Promise = require('bluebird');

module.exports = router;

var ensureAuthenticated = function(req, res, next) {
  next(); // dont worry about authentication for now
}

router.get('/safe', function(req, res) {
  let img = require('../services/safe-images.js');
  res.json(_.shuffle(img))
});

router.get('/start', ensureAuthenticated, function(req, res) {
  var ll = req.query.lat + "," + req.query.long;
  var imgArr = [];
  fsHelper.venues(ll)
    .then(function(response) {
      return Promise.map(response, function(v) {
        return fsHelper.venue({
          venue_id: v.id
        })
      })
    })
    .then(function(arr) {
      arr.forEach(function(venueResp) {
        var venue = venueResp.response.venue;

        // dont bother if venue isn't open
        // if(venue.hours && !venue.hours.isOpen) {
        //   return;
        // }

        var venueGroup = getVenueGroup(venue.photos.groups);
        venueGroup.items.forEach(function(image) {
          var size = "300x300";
          var imgObj = {
            id: image.id,
            url: image.prefix + size + image.suffix,
            venue: venue.id,
            categories: venue.categories
          };
          imgArr.push(imgObj);
        })
      })
    })
    .then(function() {
      // console.log(imgArr);
      imgArr.forEach(v => {
        v.tags = [];
        v.categories.forEach(c => {
          v.tags.push(c.shortName)
        })
      })
    })
    .then(function() {
      res.json(_.shuffle(imgArr))
    })
    .catch(function(err) {
      console.log(err);
      res.sendStatus(404);
    })
});


function getVenueGroup(groups) {
  for (var x = 0; x < groups.length; x++) {
    if (groups[x].type === "venue") {
      return groups[x];
    }
  }
  return { items: [] };
}
