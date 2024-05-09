const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect); // todas as middlewares após esta linha estarão protegidas

router.patch('/updateMyPassword', authController.updatePassword,);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.uploadUserPhoto, /*userController.resizeUserPhoto*/ userController.updateMe); 
router.delete('/deleteMe', userController.deleteMe);


router.use(authController.restrictTo('admin')) // apenas admins possuem permissão p/ executar as ações abaixo

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
