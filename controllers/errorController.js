const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  /*Object.values fará o loop nos elementos/objetos do objeto errors e o map, a cada loop, irá extrair a msg de erro de cada objeto
  errors = array com todas as msgs de erro*/
  
  const message = `Invalid input data. ${errors.join('. ')}`; //msgs do array serão separadas por . e espaço
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again!', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operacional, erro confiável: envia a mensagem para o usuário
  //EX de erros: user tentando acessar rota inexistente, envio de dados inválidos
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programação ou outro erro desconhecido: não mostrar os detalhes do erro p/ o usuário
  } else {
    // 1) Log error
    // console.error('ERROR!!!', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

//TRATAMENTO DE ERROS
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name, code: err.code, errmsg: err.errmsg, errors: err.errors };

    if (err.name === 'CastError') error = handleCastErrorDB(error); // se o erro for = CastError, erro deve ser igual ao que retorna da função handleCastErrorDB
    if (Number(err.code) === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError()

    sendErrorProd(error, res);
  }
};
//especificando 4 parâmetros, o Express entende automaticamente que se trata de uma middleware p/ manipular erros

// ******lembrar que é tudo baseado nos testes realizados no Postman (códigos, nomes do erros, formatação da msg dos erros etc)
