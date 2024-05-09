const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please, tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please, provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please, provide a valid email!'],
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please, provide a password!'],
    minlength: 8,
    select: false, //password nunca será mostrado num output (exceto ao criar um novo doc...)
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please, confirm your password!'],
    validate: {
      // isso só vai funcionar ao CRIAR um doc ou SALVAR um doc -> não usar métodos de update c/ dados sensíveis (como senha)
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // Só executa a função se a senha foi modificada -> se não, apenas saia da função e vá p/ a próx. middleware
  if (!this.isModified('password')) return next(); //this se refere ao doc atual

  this.password = await bcrypt.hash(
    this.password,
    12,
  ); /* o 12 basicamente significa "não tão fácil de decifrar a senha mas tbm
  não demorar demais p/ encriptá-la" */

  this.passwordConfirm =
    undefined; /* essa validação só é necessária ao criar um user, como agora a senha original será
  encriptada, podemos deletar este campo p/ não ser enviado para o banco de dados*/
  next();
});

userSchema.pre('save', function (next) {
  // "a senha não foi modificada? OU é um doc novo?"
  if (!this.isModified('password') || this.isNew) return next();
  // se for: false || true, retorna true e executa return next() -> ou seja, se a senha foi modificada OU é um doc novo
  // novo documento: true || true, retorna true -> executa return next() -> a senha não foi modificada OU é um doc novo
  /* atualizar documento: false || false retorna false -> não executa return next(), a senha foi modificada OU não 
  é um doc novo -> executa a linha de baixo \/*/

  this.passwordChangedAt =
    Date.now() -
    1000; /*colocando essa propriedade 1s antes garantirá que o token será sempre criado
  depois da senha ser alterada*/
  next();
});

// essa middleware será executada antes de todas as funções que tiverem um método começando com find
userSchema.pre(/^find/, function (next) {
  //isso aponta para a query atual
  this.find({ active: { $ne: false } }); // apenas os users que tiverem { active: true } serão mostrados
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
/* o método fica disponível para usar em todos os docs de user (aqueles que são resultados da query de userModel)*/

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  } // tempo que o token foi gerado < tempo de mudança da senha -> se for falso, significa que não foi alterado
  // 100 < 200 = true, foi alterado | 200 < 100 = false, não foi alterado
  // "criou uma senha, obteve o token e depois de um tempo, alterou senha" (true) | "criou/alterou senha primeiro e depois obteve o token" (false)

  return false;
};

// token temporário que será enviado ao user, possibilitando a criação de uma nova senha real
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // 32 -> nº caracteres | 'hex' converte numa string hexadecimal (0-9, A-F)

  /*-> assim como a senha real, não deve ser enviado ao db sem ser encriptado (mesmo a criptografia não sendo tão forte
qto a da senha real) | sha256 -> função encriptadora*/
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // senha temporária c/ duração de 10 min

  return resetToken; // enviado ao user o token não encriptado (então, encriptado -> banco de dados; não encriptado -> user)
};

const User = mongoose.model('User', userSchema);

module.exports = User;
