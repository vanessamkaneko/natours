const multer = require('multer');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users' );
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); //user-5890a9r86d6gsd6-38474732635.jpeg
  }
});

const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')) {
    cb(null, true)
  } else
    cb(new AppError('Not an image! Please upload only images.', 400), false)
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
])

exports.resizeTourImages = (req, res, next) => {
  console.log(req.files);
  next();
}

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
//na rota top-5-cheap, as queries serão pré-estabelecidas com as infos acima

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    // aggregate retorna uma promise, por isso o await
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, //match: p/ selecionar/filtrar documentos (no caso, com avaliações >= 4.5)
    },
    {
      $group: {
        // agrupa os docs de acordo com o id p/ trazer infos sobre eles
        _id: { $toUpper: '$difficulty' }, // no caso, seriam  agrupadas pela dificuldade: tours facéis - médias - difíceis
        numTours: { $sum: 1 }, // soma o nº de tours pela dificuldade
        numRatings: { $sum: '$ratingsQuantity' }, //soma das avaliações
        avgRating: { $avg: '$ratingsAverage' }, //média das avaliações
        avgPrice: { $avg: '$price' }, //média dos preços
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // ordem crescente de preços (menor -> maior)
    },
    /*  {
        $match: { _id: { $ne: 'EASY' }} // seleciona os elementos que não são easy (ne = not equal)
      } */
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
      /*faz a desconstrução do array de um doc e gera um doc para cada elemento do array; no caso, p/ cada data de acordo c/ o ano,
         é criado um objeto novo no array*/
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // agrupados de acordo c/ o mês
        numTourStarts: { $sum: 1 }, // soma das tours de cada mês
        tours: { $push: '$name' }, //push cria um array (pois será enviado +1 nome em alguns casos)
      },
    },
    {
      $addFields: { month: '$_id' }, // { nome do campo: nome do campo do valor que quero }
    },
    {
      $project: {
        _id: 0, // esconde o id
      },
    },
    {
      $sort: { numTourStarts: -1 }, // ordem decrescente (maior -> menor)
    },
    {
      $limit: 12, //mostrará 12 docs por vez
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // /tours-within/233/center/34.111745,-118.113491/unit/mi
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  // essa conversão é necessária porque o mongodb espera que o raio da esfera esteja em radianos, o qual é obtido pelo raio da Terra

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    /* acha docs dentro de uma certa geometria -> ou seja, serão retornados as tours que estão dentro de uma esfera que começa no 
    ponto definido pela latitude-longitude e raio de distância -> EX: distância especificada é de 250 milhas: indica que o user quer
    todas as tours que estejam nessa esfera de 250 milhas */
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // geoNear precisa ser sempre o primeiro na pipeline | necessário que pelo menos 1 campo possua index geoespacial (startLocation, no caso)
        near: { // ponto da onde calcular as distâncias
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // * 1 p/ convertê-los em numbers
        },
        distanceField: 'distance', // nome do campo que será criado e onde será armazenado todas as distâncias calculadas
        distanceMultiplier: multiplier // multiplicar pelas distâncias p/ transformar os metros em km (mesmo que dividir por 1000)
      },
    },
    {
      $project: {
        distance: 1,
        name: 1
        // mantém só a distância e o nome da tour, escondendo as outras infos do output
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    },
  });
});
