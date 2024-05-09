const Review = require("../models/reviewModel");
//const catchAsync = require("../utils/catchAsync");
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  // - Allow nested routes - ex: {{URL}}api/v1/tours/5c88fa8cf4afda39709c2955/reviews (tem o ID da tour)
  //se não for especificado o ID da tour no body, então será usado o id vindo da query/do URL
  if(!req.body.tour) req.body.tour = req.params.tourId;
  //se não for especificado o user no body, então será usado o id vindo do req.user (da middleware protect)
  if(!req.body.user) req.body.user = req.user.id;

  next();
}

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);