const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    //qndo os dados estiverem em JSON ou como Object, então as infos do virtual serão mostradas na saída (output)
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }) // cada combinação de tour + user deve ser única

reviewSchema.pre(/^find/, function (next) {
  // this se refere a query/requisição atual
  /*   this.populate({
    path: 'tour',
    select: 'name' //populate irá "popular" o campo tour c/ nome da tour  -> apenas na query/requisição e não no banco de dados 
  })*/

  this.populate({
    path: 'user',
    select: 'name photo', // irá popular o campo user c/ o nome e a foto
  });
  next();
});

/* num método estático, o this aponta p/ o model em questão (no caso, da review), possibilitando o uso do .aggregate direto (mesma coisa de)
Review.aggregate */
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', //agrupando as tours pela tour
        numRating: { $sum: 1 }, // nº total de avaliações
        avgRating: { $avg: '$rating' }, // de acordo c/ o especificado no model, cálculo da média das avaliações
      },
    },
  ]);
  console.log(stats); // retorno [ { _id: 66352cf3f6664f4130230b05, numRating: 1, avgRating: 5 } ] -> array com 1 index (ou seja, [0])

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  /* o this aponta p/ a review (doc) em questão | o constructor se refere ao model utilizado p/ o doc criado (ou seja, 
    Review (reviewSchema - reviewModel.js)) | this.tour = refere-se ao campo tour do reviewSchema - ou seja, o id da tour passado no URL
    será conferido no banco de dados da tour p/ achar o correspondente */
  //Review.calcAverageRatings(this.tour)
  this.constructor.calcAverageRatings(this.tour);
});

/*  findOneAnd serve p/ -> findByIdAndUpdate && findByIdAndDelete -> p/ esses só possuem query middleware, não doc middleware, não tendo 
acesso diretamente ao doc em questão com o this, pois o this aponta p/ a query... */
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r =
    await this.findOne(); /*...executando a query p/ retornar o doc que está sendo processado; c/ o this, cria-se uma nova
  propriedade no model c/ o valor da variável | obs: o this.r = review (current doc) */

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour); /* p/ poder executar calcAverageRatings no update e delete foi necessário usar
  a query middleware, que como não retorna o current doc, usamos o findOne() p/ obter o doc do banco de dados... E foi necessário o pre
  e post pois no pre estaríamos trabalhando com o doc antes de ser alterado */
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

/* será trabalhado o parent referencing, pois uma review pertence a uma tour e a um user (ou seja, uma review é child de tour e user),
e como não se sabe ao certo se seriam recebidas poucas ou muitas reviews, na dúvida, melhor trabalhar com parent referencing */
