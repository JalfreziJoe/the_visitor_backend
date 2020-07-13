const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/users-controller');
const router = express.Router();
const fileUpload = require('../middleware/file-upload');

router.get('/', userController.getUsersList);
router.post(
  '/signup/',
  fileUpload.single('image'),
  [
    check('name').notEmpty(),
    check('email').isEmail().normalizeEmail(),
    check('password').isLength({ min: 5 }),
  ],
  userController.signupUser
);
router.post('/login', userController.loginUser);

module.exports = router;
