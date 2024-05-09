const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name!'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration!'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size!'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // ex: 4.666666 x 10 = 46.666666 / 10 = 4.6
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price!'],
    },
    priceDiscount: {
      type: Number,
      //o this apenas faz referência a um NOVO documento sendo criado, portanto essa validation não funciona p/ updates
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true, //remove espaços do início e do fim da string (se houver)
      required: [true, 'A tour must have a description!'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image!'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], //array de números, sendo longitude primeiro e depois latitude
      address: String,
      description: String,
    },
    /* no location estamos fazendo o embedded documents -> cria-se um array de objects p/ então serem criados novos docs dentro do parent
    document (nesse caso, a tour) */
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array -> p/ ocorrer o embed
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    // /\ esse é p/ se fazer o child referencing: ou seja, a tour referenciando o user (apenas pelo ID)
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    //qndo os dados estiverem em JSON ou como Object, então as infos do virtual serão mostradas na saída (output)
  },
);

// IMPROVE READING PERFORMANCE
/* index (índice) serve p/ otimizar a procura pela informação/query solicitada -> sem ele, o mongo precisaria verificar todos os docs p/ só
então retornar o que foi solicitado -> com o index especificado, verifica apenas os docs realmente necessários -> otimizando o tempo
de processamento --> é ideal p/ qndo a info tem muitas reads, mas não qndo tem muitas inserções/atualizações porque seria necessário
atualizar os index também, levando mais tempo */
// ex: {{URL}}api/v1/tours?price[lt]=1000&ratingsAverage[gte]=4.5
tourSchema.index({
  price: 1, // price index organizado (sort) de forma ascendente
  ratingsAverage: -1 // forma descendente
});

tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
//virtual -> infos não farão parte do banco de dados

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', /* no reviewModel, no campo tour é onde ficam/ficarão guardados os IDs da tour*/
  localField: '_id' // como o id é chamado neste model
  /*assim nós fazemos a ligação deste model com o reviewModel -> mantemos a referência p/ todos os child docs no parent doc s/
  precisa guardar as infos no banco de dados - aparecendo apenas no output*/
})

// --- MONGOOSE MIDDLEWARE -> pre - acontece antes | post - acontece após---

// DOCUMENT MIDDLEWARE: é chamada antes dos comandos .save() e .create() (ou seja, chamada ANTES de um doc ser salvo no banco de dados)
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); //aqui o this se re fere ao doc que está sendo salvo/criado
  next();
}); //no caso, o doc que enviei tinha nome Test Tour 2, o slug criado foi test-tour-2

// Código responsável por fazer incluir o user dentro do tour
//tourSchema.pre('save', async function (next) {
/* guides (definido no Model) será um array com todos os users IDs, c/ o map ocorrerá o loop no array, em que cada iteração será pego o 
  user document do ID em questão, sendo salvo na variável guides*/
// const guidesPromises = this.guides.map(async id => await User.findById(id)) /* pela resposta vir de uma função assíncrona, a variável se
// tornaria um array cheio de promises... */
//this.guides = await Promise.all(guidesPromises) /*...então aqui todas as promises são executadas ao mesmo tempo | c/ o this.guides,
//o array c/ os IDs será sobreescrito com o array dos users documents */

// next();
//})

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); //aqui o this se refere a um query object, podendo ser usados outros métodos query (como o .find)
  // o this faz referência a query proveniente do features

  this.start = Date.now();
  next();
});
/* ne = not equal | serão selecionados todos os docs que o secretTour = false | todos os métodos que começam com find
(findOne, findOneAndDelete, findOneAndUpdate, findOneAndRemove) cairão nessa middleware (secretTour realmente será secreto rs) 
-> antes do const tours = await features.query ser executado, esta middleware é executada;
*/

tourSchema.pre(/^find/, function (next) {
  // this se refere a query/requisição atual
  this.populate({
    /*populate irá "popular" o campo guides c/ os dados dos users -> apenas na query/requisição e não no banco de dados */
    path: 'guides',
    select: '-__v -passwordChangedAt', // devido ao (-) na frente, oculta esses campos no output 
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE - permite adicionar hooks antes ou depois da agreggation acontecer
/* tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  /*unshift - add elementos no início do array (no caso, o match erá adicionado em todos os arrays do método aggregate, mostrando
  apenas as tours que a secretTour = false)
  //o this se refere as propriedades do método agreggate em questão

  console.log(this);
  next();
}); */

const Tour = mongoose.model('Tour', tourSchema); // nome do model, nome do schema

module.exports = Tour;
