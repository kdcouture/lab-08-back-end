'use strict';
// API Dependencies
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

// Globals
const PORT = process.env.PORT || 3009;

// Make the server
const app = express();
app.use(cors());

// Location Route
app.get('/location', searchToLatLng);

// Weather Route
app.get('/weather', getWeatherRoute);

//EventBrite Route
app.get('/events', getEventRoute);

// Wrong route catch
app.use('*', (request, response) => {
  response.send('you got to the wrong place');
});

//Location Constructor Start
function Location(query, res) {
  this.search_query = query;
  (this.formatted_query = res.body.results[0].formatted_address), (this.latitude = res.body.results[0].geometry.location.lat), (this.longitude = res.body.results[0].geometry.location.lng);
}

function searchToLatLng(request, response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent
    .get(url)
    .then(res => {
      response.send(new Location(request.query.data, res));
    })
    .catch(e => handleError(e));
}

//Weather Construtor Start
function Day(dayObj) {
  this.forecast = dayObj.summary;
  let time = new Date(dayObj.time * 1000).toDateString();
  this.time = time;
}

function getWeatherRoute(request, response) {
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${lat},${lng}`;

  return superagent
    .get(url)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(day => {
        return new Day(day);
      });
      response.send(weatherSummaries);
    })
    .catch(e => handleError(e, response));
}

//EventBrite Constructor Start
function Event(eventObj) {
  (this.link = eventObj.url), (this.name = eventObj.name.text), (this.event_date = new Date(eventObj.start.local).toDateString()), (this.summary = eventObj.summary);
}

function getEventRoute(request, response) {
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;

  return superagent
    .get(url)
    .then(result => {
      console.log(result.body.events);
      const eventSummaries = result.body.events.map(eve => {
        return new Event(eve);
      });
      response.send(eventSummaries);
    })
    .catch(e => handleError(e, response));
}

//Error handling
function handleError(e, res) {
  if (res) res.status(500).send('Server Failure');
}

// Start the server.
app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
