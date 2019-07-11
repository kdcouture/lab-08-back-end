DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS locaitons;

-- search_query: locationName,
-- formatted_query: result.body.results[0].formatted_address,
-- latitude: result.body.results[0].geometry.location.lat,
-- longitude: result.body.results[0].geometry.location.lng

CREATE TABLE locations
(
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7)
);

CREATE TABLE weathers
(
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);