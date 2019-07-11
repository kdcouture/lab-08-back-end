// Weather Page
app.get('/weather', searchWeather);

function Weather(forecast, time) {
  this.forecast = forecast;
  this.time = time;
}

function searchWeather(request, response) {
  const lat = request.query.data.latitude;
  const lng = request.query.data.longitude;
  const locationName = request.query.data;
  const qryString = `SELECT * FROM weathers`;
  const url = `https://api.darksky.net/forecast/${WEATHER_API_KEY}/${lat},${lng}`;

  checkForExistance(qryString, ifExist, noExistW, locationName, url);
}

// does exist
function ifExist(sqlResult) {
  res.send(sqlResult.rows[0]);
}

// check DB for existance
function checkForExistance(qryString, doesExist, noExist, locationName, url) {
  client.query(qryString).then(sqlResult => {
    if (sqlResult.rowCount === 0) {
      noExist(locationName, url);
    } else {
      doesExist(sqlResult);
    }
  });
}

// not exists
function noExistW(locationName, url) {
  superagent
    .get(url)
    .then(result => {
      //shape data
      const weatherData = result.body;
      let res = weatherData.daily.data.map(element => {
        let date = new Date(element.time * 1000).toDateString();
        let tempWeather = new Weather(element.summary, date);

        let id = client.query(`SELECT id FROM locations WHERE search_query=$1`, [locationName]);

        // make table
        client.query(
          `INSERT INTO weathers (
          forcast,
          time,
          location_id
          ) VALUES ($1, $2, $3)
          `,
          [tempWeather.forecast, tempWeather.time, id]
        );

        return tempWeather;
      });
      response.send(res);
    })
    .catch(e => {
      console.error(e);
      response.status(500).send('oops');
    });
}
