# iVipBase realtime database

Um motor e servidor de banco de dados NoSQL rápido, de baixo consumo de memória, transacional, com suporte a índices e consultas para node.js e navegador, com notificações em tempo real para alterações de dados. Suporta o armazenamento de objetos JSON, arrays, números, strings, booleanos, datas, bigints e dados binários (ArrayBuffer).

Inspirado por (e amplamente compatível com) o banco de dados em tempo real do Firebase e AceBase, com funcionalidades adicionais e menos fragmentação/duplicação de dados. Capaz de armazenar até 2^48 (281 trilhões) de nós de objeto em um arquivo de banco de dados binário que teoricamente pode crescer até um tamanho máximo de 8 petabytes.

O iVipBase é fácil de configurar e pode ser executado em qualquer lugar: na nuvem, NAS, servidor local, PC/Mac, Raspberry Pi, no [navegador](#experimente-o-ivipbase-no-seu-navegador), onde você quiser.

## Índice

- [iVipBase realtime database](#ivipbase-realtime-database)
  - [Índice](#índice)
  - [Começando](#começando)
    - [Pré-requisitos](#pré-requisitos)
    - [Instalação](#instalação)
    - [Criar um banco de dados local](#criar-um-banco-de-dados-local)
    - [Experimente o iVipBase no seu navegador](#experimente-o-ivipbase-no-seu-navegador)
    - [Configurar um servidor de banco de dados](#configurar-um-servidor-de-banco-de-dados)
    - [Conectar-se a um banco de dados remoto](#conectar-se-a-um-banco-de-dados-remoto)
  - [Exemplo de uso](#exemplo-de-uso)
    - [Criando um banco de dados](#criando-um-banco-de-dados)
    - [Carregando dados](#carregando-dados)
  
## Começando

O iVipBase está dividido em dois pacotes:
* **ivipbase**: mecanismo de banco de dados iVipBase local, ponto de extremidade do servidor para permitir conexões remotas. Inclui autenticação e autorização de usuário integradas, suporta o uso de provedores externos OAuth, como Facebook e Google ([github](https://github.com/ivipservices/ivipbase), [npm](https://www.npmjs.com/package/ivipbase))
* **ivipbase-core**: funcionalidades compartilhadas, dependência do pacote acima ([github](https://github.com/ivipservices/ivipbase-core), [npm](https://www.npmjs.com/package/ivipbase-core))

Por favor, relate qualquer erro ou comportamento inesperado que encontrar criando uma issue no Github.

### Pré-requisitos

O iVipBase é projetado para ser executado em um ambiente [Node.js](https://nodejs.org/), **também é possível usar bancos de dados iVipBase no navegador**! Para executar o iVipBase no navegador, basta incluir um arquivo de script e você estará pronto! Consulte [iVipBase no navegador](#experimente-o-ivipbase-no-seu-navegador) para mais informações e exemplos de código!

### Instalação

Todos os repositórios do iVipBase estão disponíveis no npm. Você só precisa instalar um deles, dependendo de suas necessidades:

### Criar um banco de dados local

Se você deseja usar um **banco de dados iVipBase local** em seu projeto, instale o pacote [ivipbase](https://www.npmjs.com/package/ivipbase).

```sh
npm install ivipbase
```

Em seguida, crie (abra) seu banco de dados:
```js
const { initializeApp, getDatabase } = require('ivipbase');

const app = initializeApp({dbname: "my_db"});

const db = getDatabase(app);
db.ready(() => {
    // Do stuff
});
```

### Experimente o iVipBase no seu navegador

Se você quiser experimentar o iVipBase em execução no Node.js, basta abri-lo no [RunKit](https://npm.runkit.com/acebase) e seguir os exemplos. Se você quiser experimentar a versão do iVipBase para o navegador, abra [google.com](google.com) em uma nova guia (o GitHub não permite que scripts entre sites sejam carregados) e execute o trecho de código abaixo para usá-lo imediatamente no console do seu navegador.

*Para experimentar o iVipBase no RunKit:*

```js
const { initializeApp, getDatabase } = require('ivipbase');

const app = initializeApp({dbname: "my_db"});

const db = getDatabase(app);
db.ready(async () => {
    await db.ref('test').set({ text: 'This is my first AceBase test in RunKit' });

    const snap = await db.ref('test/text').get();
    console.log(`value of "test/text": ` + snap.val());
});
```

*Para experimentar o iVipBase no console do navegador:*

```js
await fetch('https://cdn.jsdelivr.net/npm/ivipbase@latest/dist/browser.min.js')
    .then(response => response.text())
    .then(text => eval(text));

if (!initializeApp) { throw 'iVipBase not loaded!'; }

const app = initializeApp({dbname: "my_db"});

const db = getDatabase(app);
db.ready(async () => {
    await db.ref('test').set({ text: 'This is my first AceBase test in the browser' });

    const snap = await db.ref('test/text').get();
    console.log(`value of "test/text": ` + snap.val());
});
```

### Configurar um servidor de banco de dados
Se você deseja configurar um **servidor iVipBase**, poderá configurar no `initializeApp` propriedades próprias para o funcionamento em servidor com uso do [Express.js](https://expressjs.com/pt-br/).

```js
const { initializeApp, MongodbSettings } = require('ivipbase');

const app = initializeApp({
    dbname: "my_db", 
    server: {
        host: "0.0.0.0",
        port: 8080,
        maxPayloadSize: "50mb"
    },
    storage: new MongodbSettings({
        host: "0.0.0.0",
        port: 27017,
        username: "admin",
        password: "1234"
    })
});

app.ready(() => {
    // Servidor em execução
});
```

### Conectar-se a um banco de dados remoto
Se você deseja se conectar a um servidor iVipBase remoto (ou local), poderá configurar no `initializeApp` propriedades próprias para o funcionamento com uso do [API Fetch](https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API/Using_Fetch) ou [node-fetch](https://www.npmjs.com/package/node-fetch).

```js
const { initializeApp } = require('ivipbase');

const app = initializeApp({
    dbname: "my_db", 
    client: {
        host: "0.0.0.0",
        port: 8080
    }
});

app.ready(() => {
    // Conectado!
});
```

## Exemplo de uso

A API é semelhante à do banco de dados em tempo real do Firebase e AceBase, com adições.

### Criando um banco de dados

Criar um novo banco de dados é tão simples quanto abri-lo. Você escolher entre conectar com banco de dados existente, como o MongoDB usando configuração MongodbSettings, ou optar por armazenamento binário (se o arquivo do banco de dados não existir, ele será criado automaticamente).

```javascript
const { initializeApp, getDatabase, MongodbSettings } = require('ivipbase');

const app = initializeApp({
    dbname: "mydb", // Cria ou abre um banco de dados com o nome "mydb"
    logLevel: "log",
    storage: new MongodbSettings({
        host: "0.0.0.0",
        port: 27017,
        username: "admin",
        password: "1234"
    })
});

const db = getDatabase(app);  

db.ready(() => {
    // o banco de dados está pronto para uso!
});
```

NOTA: A opção `logLevel` especifica quanto de informação deve ser gravado nos logs do console. Os valores possíveis são: `'verbose'`, `'log'` (padrão), `'warn'` e `'error'` (apenas erros são registrados)

### Carregando dados

