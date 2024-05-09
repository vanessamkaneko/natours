/*const fs = require('fs');
const Tour = require("../models/tourModel");
 const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
); 

exports.checkID = (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);

  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID'
    });
  }
  next();
}
com este Param Middleware, automaticamente todas as rotas farão a checagem/validação do ID sem ter que colocá-la individualmente
em cada rota

exports.checkBody = (req, res, next) => {
  if(!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price'
    })
  }
  next();
}

exports.getAllTours = (req, res) => {
  console.log(req.requestTime);

  res.status(200).json({
    status: 'success',
    requestAt: req.requestTime,
    results: tours.length,
    data: {
      tours
    } 
  });
}

exports.getTour = (req, res) => {
  console.log(req.params);
  const id = req.params.id * 1; 
  -> uma string que parece um número (ex: '5') ao ser multiplicada por um número real, automaticamente
  é convertida em number*/

/* const tour = tours.find(el => el.id === id);  .find -> faz iterações em arrays; no caso, a cada loop verifica se o elemento atual
  possui o mesmo id que foi mandado na url, sendo guardado na variável apenas se o valor for true 

   res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  }); 
};

exports.createTour = (req, res) => {
  console.log(req.body); 

  const newId = tours[tours.length - 1].id + 1; 
  -> pega-se o último elemento do array (tours.length - 1) e adiciona +1 no id deste elemento (criando novo ID)
  -> lembre-se: índices de um array iniciam no 0
  const newTour = Object.assign({ id: newId }, req.body); 
  -> Object.assign -> permite criar um novo objeto juntando dois objetos já existentes

  tours.push(newTour);

  fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours), err => {
    res.status(201).json({
      status: 'success',
       data: {
        tour: newTour
      } 
    })
  });
};

exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>'
    }
  })
};

exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'success',
    data: null
  })
}

/* ---- createTour ----
const newTour = new Tour({
  name:
  rating:
  price:
}),

newTour.save().then(doc => {
  console.log(doc);
}).catch(err => {
  console.log(err)
})

---- filtrar por query ----

const query = Tour.find()
  .where('duration')
  .equals(5)
  .where('difficulty')
  .equals('easy')

const query = Tour.find({
    duration: 5,
    difficulty: 'easy'
  });

  COM O FILTRO: 
  log do req.query => { difficulty: 'easy', page: '2', sort: '1', limit: '10' }
  log do queryObj => { difficulty: 'easy' }


   try {
    BUILD QUERY
     1A)Filtering
    /* const queryObj = {
      ...req.query,
    }; /*cria-se uma cópia do momento da req: no caso, um novo objeto com todas as chaves-valores do query*/
    //const excludedFields = ['page', 'sort', 'limit', 'fields'];
    //excludedFields.forEach((el) => delete queryObj[el]);
    /* aqui criou-se um filtro: caso na query tiver um dos 4 campos, é deletado (por ser uma cópia, não afetando a url original) */

    // 1B) Advanced filtering
    //let queryStr = JSON.stringify(queryObj);
    //queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    /* greater than or equal, greater than, less than or equal, less than */
    // segundo essa expressão, se estes operadores forem encontrados 1x ou + na url, é p/ ser acrescentado o $ (pois é o operado do mongodb)

    //let query = Tour.find(JSON.parse(queryStr));
    /**** o .find retorna uma mongoose query, possibilitando o uso de outros métodos, como o sort, select, skip e limit
    */

    // SORTING
    /*if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' '); // em relação a formatação na url: split - separa as palavras na vírgula | join - add um espaço entre as palavras
      query = query.sort(sortBy);
      /* no url, se tiver o sort na query, então os resultados serão ordenados de acordo a(s) propriedade(s) especificada(s);
      ex: 127.0.0.1:3000/api/v1/tours?sort=price,ratingsAverage ----> resultados ordenados pelo preço e avaliações
      **** req.query.sort é o que vem após o "sort=" 
    } else {
      query = query.sort('-createdAt _id');
      /* caso não seja especificado nenhum campo sort na query da url, será filtrado pela data de criação (no caso, mais recentes 1º) 
   } */


   // FIELD LIMITING
   /* if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
      //127.0.0.1:3000/api/v1/tours?fields=name,duration,difficulty,price -> mostrará as tours apenas com esses 4 campos
    } else {
      query = query.select('-__v'); // o " - " fará a exclusão do campo indicado (__v), não enviando-o p/ o user
    } */


    //PAGINATION
    /*const page = req.query.page * 1 || 1; //default = page 1
    const limit = req.query.limit * 1 || 100; // default = limit 100 (ou seja, máximo de 100 resultados por page)
    const skip = (page - 1) * limit;
    /*ex: page=3&limit=10 --> page 1 = 1-10, page 2 = 11-20, page 3 = 21-30
    Pela fórmula: 2 x 10 = 20, pular 20 resultados, caindo então na page 3

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('This page does not exist!'); 
    } */