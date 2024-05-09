const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id);

  if(!doc){
    return next(new AppError('No document found with that ID!', 404))
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true, //se true, retorna o doc modificado ao invés do original
    runValidators: true, //se true, toda vez que o doc for modificado, as validações definidas no Schema serão rodadas novamente
  });

  if(!doc){
    return next(new AppError('No document found with that ID!', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc
    },
  });
});

exports.createOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {
    //const doc = await Model.findById(req.params.id).populate('reviews');
  let query = Model.findById(req.params.id);
  if(popOptions) query = query.populate(popOptions);
  const doc = await query;

  if(!doc){
    return next(new AppError('No document found with that ID!', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
}); 

exports.getAll = Model => catchAsync(async (req, res, next) => {

  // To allow for nested GET reviews on tour
   /* se a req não for feita por uma nested route, o filtro será o objeto vazio e serão trazidos todas as reviews; se for uma nested,
  então será trazida a review com o id especificado */
  let filter = {}
  if(req.params.tourId) filter = {tour: req.params.tourId}

  const features = new APIFeatures(Model.find(filter), req.query) //Tour.find() retorna uma query
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const doc = await features.query;
  //const doc = await features.query.explain(); -> p/ análises dos index

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc,
    },
  });
});