'use strict';
// API Dependencies
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const pg = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;

// postgress server setup (SQL DB)
const client = new pg.Client(DATABASE_URL);
client.connect();
client.on('error', error => {
  console.log(error);
});

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
  const locationName = request.query.data;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationName}&key=${GEOCODE_API_KEY}`;
  console.log('right here');

  // if is in database get it from DB
  client.query(`SELECT * FROM locations WHERE search_query=$1`, [locationName]).then(sqlResult => {
    if (sqlResult.rowCount === 0) {
      console.log('getting from Google');
      // else do everything normal

      superagent
        .get(url)
        .then(result => {
          // TODO make this into an Ojbect constructor
          let location = new Location(locationName, result);

          // Save data to postgres
          client.query(
            `INSERT INTO locations (
              search_query,
              formatted_query,
              latitude,
              lognitude
              ) VALUES ($1, $2, $3, $4)
              `,
            [location.search_query, location.formatted_query, location.latitude, location.longitude]
          );
          response.send(location);
        })
        .catch(e => {
          console.error(e);
          response.status(500).send('oops');
        });
    } else {
      console.log('sending from DB: ');
      response.send(sqlResult.rows[0]);
    }
  });
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
  const url = `https://api.darksky.net/forecast/${WEATHER_API_KEY}/${lat},${lng}`;

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
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;

  const url = `https://www.eventbriteapi.com/v3/events/search/?location.longitude=${lng}&location.latitude=${lat}&expand=venue&token=${EVENTBRITE_API_KEY}`;

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
