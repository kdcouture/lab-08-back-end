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
  
});

// Globals
const PORT = process.env.PORT || 3009;

// Make the server
const app = express();
app.use(cors());

// Location Route
app.get('/location', searchToLatLng);

// Weather Route
app.get('/weather', searchWeather);

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
  

  // if is in database get it from DB
  client.query(`SELECT * FROM locations WHERE search_query=$1`, [locationName]).then(sqlResult => {
    if (sqlResult.rowCount === 0) {
      
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
              longitude
              ) VALUES ($1, $2, $3, $4)
              `,
            [location.search_query, location.formatted_query, location.latitude, location.longitude]
          );
          response.send(location);
        })
        .catch(e => {
          
          response.status(500).send('oops');
        });
    } else {
      
      response.send(sqlResult.rows[0]);
    }
  });
}

//Weather Construtor Start
function Day(forecast, time) {
  this.forecast = forecast;
  this.time = time;
}
// =============================
function searchWeather(request, response) {
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;
  const locationName = request.query.data;
  const qryString = `SELECT * FROM weathers WHERE location_id=${locationName.id}`;
  
  const url = `https://api.darksky.net/forecast/${WEATHER_API_KEY}/${lat},${lng}`;

  checkForExistance(qryString, ifExistW, noExistW, locationName, url, response);
}

// does exist (weather)
function ifExistW(sqlResult, res) {
  
  let weatherArr = [];
  // 
  sqlResult.rows.forEach(day => {
    weatherArr.push(new Day(day.forecast, day.time));
  });
  res.send(weatherArr);
}

// check DB for existance
function checkForExistance(qryString, doesExist, noExist, locationName, url, response) {
  client.query(qryString).then(sqlResult => {
    if (sqlResult.rowCount === 0) {
      noExist(locationName, url, response);
    } else {
      
      doesExist(sqlResult, response);
    }
  });
}

// not exists
function noExistW(locationName, url, response) {
  superagent
    .get(url)
    .then(result => {
      //shape data
      const weatherData = result.body;
      let res = weatherData.daily.data.map(element => {
        let date = new Date(element.time * 1000).toDateString();
        let tempWeather = new Day(element.summary, date);
        
        // make table
        client.query(
          `INSERT INTO weathers (
          forecast,
          time,
          location_id
          ) VALUES ($1, $2, $3);
          `,
          [tempWeather.forecast, tempWeather.time, locationName.id]
        );

        return tempWeather;
      });
      response.send(res);
    })
    .catch(e => {
      
      response.status(500).send('oops');
    });
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
  
});
