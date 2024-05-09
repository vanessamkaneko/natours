const express = require('express');
const tourController = require('../controllers/tourController');
//const { getAllTours, createTour, getTour } = require('./../controllers/tourController') <- isso evitaria ter de colocar 'tourController.' em todos
const reviewRouter = require('./reviewRoutes');

const authController = require('../controllers/authController');

const router = express.Router(); // aqui é uma middleware

//router.param('id', tourController.checkID); //Param Middleware

router.use('/:tourId/reviews', reviewRouter); // p/ o caminho com /:tourId/reviews, usar o caminho do reviewRouter

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within/233/center/34.111745,-118.113491/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guides'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guides'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
