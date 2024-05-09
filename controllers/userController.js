const multer = require('multer');
//const sharp = require('sharp'); erros!
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
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
/* console.log(req.file) => {
  fieldname: 'photo',
  originalname: 'leo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  destination: 'public/img/users',
  filename: '45421b53989c4f52a8ba04a251ba96e6',
  path: 'public\\img\\users\\45421b53989c4f52a8ba04a251ba96e6',
  size: 207078
} */
//const multerStorage = multer.memoryStorage();

// testando se o doc upado é uma img
const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')) {
    cb(null, true)
  } else
    cb(new AppError('Not an image! Please upload only images.', 400), false)
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
}) // definindo o destino das imgs upadas

exports.uploadUserPhoto = upload.single('photo') // .single pois só terá 1 img p/ upar | photo -> nome do campo p/ upar a foto

/* exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if(!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now().jpeg}`

  await sharp(req.file.buffer).resize(500, 500).toFormat('jpeg').jpeg({ quality: 90 }). toFile(`public/img/users/${req.file.filename}`)
  next();
}) */

/* ocorre o loop em todos o campos do obj (req.body), checando se há os allowedFields; se houver, é criado um novo campo no newObj com o mesmo nome 
e mesmo valor, caso contrário, o campo que não faz parte do allowedFields é ignorado */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {}

  //Object.keys transforma {} p/ []
  Object.keys(obj).forEach(el => {
    if(allowedFields.includes(el)) newObj[el] = obj[el]
  })
  return newObj;
}

// User visualizando ele mesmo
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
}

// Update feito pelo user
exports.updateMe = catchAsync(async (req, res, next) => {

  // 1) Create error if user POSTs password data
    if(req.body.password || req.body.passwordConfirm) {
      return next(new AppError('This route is not for password updates. Please use /updateMyPassword', 400))
    }

  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email') // irá filtrar o req.body, mantendo apenas o name e email
  if (req.file) filteredBody.photo = req.file.filename; /* a foto upada virá com o filename gerado ao invés do nome original ->
  original: leo.jpg | filename: user-5c8a1f292f8fb814b56fa184-1715221299931.jpeg */

    // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true } );
  // new: retorna o novo objeto atualizado ao invés do antigo

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    } 
  })
});

// Delete feito pelo user
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false } ) // só deixa o user inativo, não deleta do banco de dados

  res.status(204).json({
    status: 'success',
    data: null

  })
})

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead'
  })
}

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Update feito pelo admin
exports.updateUser = factory.updateOne(User); // não atualizar senhas com este!

// Delete feito pelo admin
exports.deleteUser = factory.deleteOne(User);