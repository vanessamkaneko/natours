const mongoose = require('mongoose');
/* possibilita a interação do código em JS com o banco de dados; um nível acima de abstração em relação ao mongodb e node.js */
const dotenv = require('dotenv');

/* uncaught exceptions -> erros que ocorrem no código síncrono e que não foram tratados em lugar algum -> são enviados diretamente
p/ o tratamento de erros */
process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION!!! Shutting down the server...');
  console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

mongoose
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    family: 4,
  })
  .then(() => {
    console.log('DB connection successful!');
  })
  .catch((e) => console.log(e));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

/* unhandledRejection -> permite tratar erros que ocorrem foram do express, por ex, aqueles relacionados ao banco de dados (como falha
na conexão com o db ou falha no login); p/ erros que ocorrem no código ASSÍNCRONO que não foram previamente tratados*/
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION!!! Shutting down the server...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1); // code 1 = uncaught exception
  });
});
/* primeiro o server é fechado e só depois é finalizado pelo process.exit, ou seja, dá tempo de todas as requisições serem 
concluídas antes do server ser finalizado */

/*
--- APPLICATION LOGIC ---
-> Referente aos Controllers e Routes
-> Código destinado à implementação da aplicação e não a resolver o problema de negócio/dor do cliente; 
é sobre os aspectos técnicos da aplicação (controle de requests/responses, ponte entre models e views)

--- BUSINESS LOGIC ---
-> Referente aos Models
-> Código destinado à resolver o problema de negócios/dor do cliente
-> Diretamente relacionado às regras de negócios, como o negócio funciona e suas necessidades
-> Exemplos: criar novas tours no banco de dados, checar se a senha do usuário está correta, validar o input do user,
garantir que apenas os usuários que compraram uma tour possam revisá-la
 */
