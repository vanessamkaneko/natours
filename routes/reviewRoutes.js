const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

/* Por padrão, cada router só tem acesso aos parâmetros de suas rotas específicas, então no caso o post dessa rota não tem acesso ao
tourId definido no tourRoutes -> porém, como precisamos do tourId, usa-se o {mergeParams: true} p/ se ter acesso à info da outra rota...
Portanto, não importa se for uma rota: POST /tour/4521cs6f/reviews ou POST /reviews, por ex...  */
const router = express.Router({ mergeParams: true });

router.use(authController.protect); // a partir daqui, nenhuma ação pode ser realizada sem autenticação (precisa estar logado)

router
  .route('/') /*... todos irão cair aqui*/
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview /* <--- mais especificamente aqui */,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(authController.restrictTo('user', 'admin'), reviewController.updateReview)
  .delete(authController.restrictTo('user', 'admin'), reviewController.deleteReview);

module.exports = router;
