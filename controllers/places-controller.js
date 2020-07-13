const HttpError = require('../models/http-error');
const fs = require('fs');
const Place = require('../models/place');
const User = require('../models/user');
const getCoordsForAddress = require('../util/location');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const getPlaceById = async (req, res, next) => {
  console.log('GET request in Places');
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError("Couldn't find a place with that id", 500));
  }
  if (!place) {
    return next(new HttpError("Couldn't find a place with that id", 404));
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  console.log('get places with user');
  const uid = req.params.uid;
  let places;
  try {
    //places = await Place.find({ creator: uid });
    // alternative request
    places = await User.findById(uid).populate('places');
  } catch (err) {
    return next(new HttpError("Couldn't find a place with that user id", 500));
  }
  if (!places || places.length == 0) {
    return next(new HttpError("Couldn't find a place with that user id", 404));
  }
  res.json({
    //places: places.map(place => place.toObject({ getters: true })),
    // alternative request
    places: places.places.map(place => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  console.log('create place');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Something isn't right with the data", 422));
  }
  const { title, description, address } = req.body;
  let coords;
  try {
    coords = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const newPlace = new Place({
    title,
    description,
    address,
    location: coords,
    image: req.file.path.replace(/\\/g, '/'),
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(new HttpError('Creating place failed', 500));
  }

  if (!user) {
    return next(new HttpError("Can't find user by that id", 404));
  }

  //console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPlace.save({ session: sess });
    user.places.push(newPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Created place failed, please retry. ' + err,
      500
    );
    return next(error);
  }
  res.status(201).json({ place: newPlace });
};

const patchPlace = async (req, res, next) => {
  console.log('patch place (update)');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError('Title and or description is not valid', 422));
  }
  const placeId = req.params.pid;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError("Couldn't update a place with that id", 500));
  }

  if (!place) return next(new HttpError('No place with that ID', 401));
  console.log(place.creator.toString());
  console.log(req.userData.userId);
  if (place.creator.toString() !== req.userData.userId)
    return next(new HttpError('No auth to edit this place', 401));

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(new HttpError("Couldn't save update ", 500));
  }

  res.status(201).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  console.log('delete place');
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    return next(new HttpError("Couldn't delete a place with that id", 500));
  }

  if (!place) {
    return next(new HttpError("Couldn't find a place with that id", 404));
  }

  console.log(place.creator.id);
  console.log(req.userData.userId);
  if (place.creator.id !== req.userData.userId)
    return next(new HttpError('No auth to delete this place', 401));

  let placeImage = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Couldn't delete place", 500));
  }

  console.log(placeImage);
  fs.unlink(placeImage, err => {
    console.log('DeletePlace unlink: ' + err);
  });
  res.status(200).json({ message: 'Place ' + placeId + ' has been deleted' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.patchPlace = patchPlace;
exports.deletePlace = deletePlace;
