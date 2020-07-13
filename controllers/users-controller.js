const HttpError = require('../models/http-error');
const User = require('../models/user');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getUsersList = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password'); // using minus removes this property of the find
  } catch (err) {
    return next(new HttpError('Fetch users failed', 500));
  }

  res.json({ users: users.map(user => user.toObject({ getters: true })) });
};

const signupUser = async (req, res, next) => {
  //console.log('signup user' + req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError('Name, email or pass is not valid', 422));
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError('Signup failed. Try again later ' + err, 500));
  }

  if (existingUser) {
    return next(new HttpError('An error occured', 422));
  }

  let hashedP;
  try {
    hashedP = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError('Signup failed. Try again later ', 500));
  }

  const newUser = new User({
    name,
    email,
    image: req.file.path.replace(/\\/g, '/'),
    password: hashedP,
    places: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    const error = new HttpError(
      'User sign-up failed, please retry later. err: ' + err,
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'User sign-up failed, please retry later. err: ' + err,
      500
    );
  }

  res
    .status(200)
    .json({ userId: newUser.id, email: newUser.email, token: token });
};

const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError('Login failed. Try again later ' + err, 500));
  }

  if (!existingUser) {
    return next(new HttpError('Logging failed. Try again later', 500));
  }

  let isValidPass = false;
  try {
    isValidPass = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(
      new HttpError('Logging in failed. Please check credentials', 500)
    );
  }

  if (!isValidPass) {
    return next(new HttpError('Login failed. Please check your creds', 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'User sign-up failed, please retry later. err: ' + err,
      500
    );
  }

  res.status(200).json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsersList = getUsersList;
exports.signupUser = signupUser;
exports.loginUser = loginUser;
