const cors = require('cors')
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');


const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');


const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'))

//Implement CORS
app.use(cors())

//GET, POST, PUT, PATCH, DELETE
app.options('*', cors())

// MIDDLEWARES - (etapa que fica entre a request e a response na qual a request é submetida enquanto é processada)
// --- GLOBAL MIDDLEWARES ---

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [
        "'self'",
        "'http://127.0.0.1:3000/",
        'blob:',
        'https://*.mapbox.com',
        'https://cdn.jsdelivr.net',
        'https://js.stripe.com/v3/'
      ],
      scriptSrc: [
        "'self'",
        "'http://127.0.0.1:3000/'",
        'https://*.mapbox.com',
        'https://cdn.jsdelivr.net',
        'https://js.stripe.com/v3/',
        "'unsafe-inline'",
        'blob:',
      ],
      connectSrc: ["'self'"]
    },
  })
))

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(
    morgan('dev'),
  ); /* mostra no terminal o tipo e o status code da request... */
}

// Limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //60 min x 60 s x 1000 ms
  message: 'Too many requests from this IP, please try again in an hour!'
  // permitido: 100 requisições do mesmo IP por hora; caso seja excedido, é enviado um erro
});
app.use('/api', limiter);

// Body parser; reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // necessário p/ ter acesso ao body | tamanho máx. do body: 10 kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// ("limpa" todas as infos que vão p/ a aplicação vindas de códigos maliciosos: protege contra ataques))
app.use(mongoSanitize()) /* procura no req.body, req.query e req.params e filtra os $ e . (pois é como o operadores do MongoDB são escritos)*/

// Data sanitization against XSS
app.use(xss()); /* protegerá qualquer input do user de códigos HTML maliciosos (transforma símbolos html em entidade html ->
código que representa o símbolo)*/

// Prevent parameter pollution
// api/v1/tours?sort=duration&sort=price -> propriedades duplicadas; só retornou pela última (price)
// whitelist: permite que as propriedades especificadas sejam duplicadas (ex: api/v1/tours?duration=5&duration=9)
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));


/* Uma middleware que será global deve ser definida antes de todas as rotas, caso contrário, a requisição do ciclo de 
responses será finalizada sempre que uma rota for executada, não sendo chamada a middleware que estiver após a rota em questão*/
/* app.use((req, res, next) => {
  console.log('Hello!!! Middleware');
  next(); //deve sempre ser chamado numa middleware para que o ciclo de req/res não fique "preso" no lugar, não sendo enviado a res p/ o user
}); */

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString ();
  //console.log(req.cookies);
  next();
});

// ROUTES
app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter); // aqui especificamos a url/caminho em que queremos utilizar a middleware
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);


app.all('*', (req, res, next) => {  // todas as requisições que não forem encontradas nas outras rotas, cairão nessa
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); /*sempre que é passado um parâmetro p/ o next, automaticamente
   se entende que é um erro, pulando direto p/ a middleware de erro*/
})

app.use(globalErrorHandler)

module.exports = app;
