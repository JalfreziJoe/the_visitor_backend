const axios = require('axios');
const HttpError = require('../models/http-error');

/**
 *
 * @param {Single line address of a place} address
 */
// async and await is used instead of promises
async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
      address
    )}&outFields=Match_addr,Addr_type`
  );

  const data = response.data;
  if (!data || data.candidates.lenght === 0) {
    return next(new HttpError('Location not found', 422));
  }

  const coordinates = {
    lat: data.candidates[0].location.y,
    lon: data.candidates[0].location.x,
  };
  return coordinates;
}

module.exports = getCoordsForAddress;
