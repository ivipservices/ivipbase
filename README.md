# iVipBase realtime database (EM DESENVOLVIMENTO)

Um motor e servidor de banco de dados NoSQL rápido, de baixo consumo de memória, transacional, com suporte a índices e consultas para node.js e navegador, com notificações em tempo real para alterações de dados. Suporta o armazenamento de objetos JSON, arrays, números, strings, booleanos, datas, bigints e dados binários (ArrayBuffer).

Inspirado por (e amplamente compatível com) o banco de dados em tempo real do Firebase e AceBase, com funcionalidades adicionais e menos fragmentação/duplicação de dados. Capaz de armazenar até 2^48 (281 trilhões) de nós de objeto em um arquivo de banco de dados binário que teoricamente pode crescer até um tamanho máximo de 8 petabytes.

O iVipBase foi concebido para fornecer serviços de controle e gerenciamento de dados, com ênfase em outros serviços como autenticação, armazenamento em nuvem, funções de nuvem e extensões de nuvem, de maneira rápida e menos burocrática possível. A proposta é oferecer aos desenvolvedores do projeto alternativas, autonomia e/ou evitar encargos financeiros associados ao uso de serviços, em contraste com o Firebase.

Com o iVipBase, os usuários têm a opção de armazenar e consumir dados localmente, em sua própria máquina ou servidor virtual. Além disso, há a possibilidade de contar com serviços remotos nos servidores da iVipServices (ainda em fase de planejamento). Em outras palavras, o iVipBase proporciona aos projetos a liberdade de tomar decisões quanto aos serviços de controle e gerenciamento de dados, oferecendo flexibilidade e escolha em relação aos recursos adicionais disponíveis.

O iVipBase é fácil de configurar e pode ser executado em qualquer lugar: na nuvem, NAS, servidor local, PC/Mac, Raspberry Pi, no [navegador](#experimente-o-ivipbase-no-seu-navegador), onde você quiser.

## Índice

- [iVipBase realtime database (EM DESENVOLVIMENTO)](#ivipbase-realtime-database-em-desenvolvimento)
  - [Índice](#índice)
  - [Começando](#começando)
    - [Pré-requisitos](#pré-requisitos)
    - [Instalação](#instalação)
    - [Criar um banco de dados local](#criar-um-banco-de-dados-local)
    - [Experimente o iVipBase no seu navegador](#experimente-o-ivipbase-no-seu-navegador)
- [`initializeApp` - Inicialização](#initializeapp---inicialização)
  - [Uso](#uso)
  - [Contexto de aplicação web e/ou client](#contexto-de-aplicação-web-eou-client)
    - [Opções do Objeto `options`](#opções-do-objeto-options)
  - [Contexto de aplicação servidor](#contexto-de-aplicação-servidor)
    - [Opções do Objeto `options`](#opções-do-objeto-options-1)
      - [Opções do Objeto `options.email`](#opções-do-objeto-optionsemail)
      - [Opções do Objeto `options.email.server`](#opções-do-objeto-optionsemailserver)
    - [Opções do Objeto `options.authentication`](#opções-do-objeto-optionsauthentication)
- [`getDatabase` - API banco de dados](#getdatabase---api-banco-de-dados)
  - [`get` - Carregando dados](#get---carregando-dados)
  - [`set` - Armazenando dados](#set---armazenando-dados)
  - [`update` - Atualizando dados](#update---atualizando-dados)
  - [`remove`, `null` - Removendo dados](#remove-null---removendo-dados)
  - [`push` - Gerando chaves exclusivas](#push---gerando-chaves-exclusivas)
  - [`Array` - Usando matrizes](#array---usando-matrizes)
  - [`count` - Contando filhos](#count---contando-filhos)
  - [`include`, `exclude` - Limitar o carregamento de dados aninhados](#include-exclude---limitar-o-carregamento-de-dados-aninhados)
  - [`forEach` - Iterando filhos](#foreach---iterando-filhos)
  - [`TypeScript` - Afirmando tipos de dados](#typescript---afirmando-tipos-de-dados)
  - [`on`, `off` - Monitorando alterações de dados em tempo real](#on-off---monitorando-alterações-de-dados-em-tempo-real)
    - [`*`, `$` - Utilizando variáveis e curingas em caminhos de assinatura](#----utilizando-variáveis-e-curingas-em-caminhos-de-assinatura)
    - [`notify_` - Notificar apenas eventos](#notify_---notificar-apenas-eventos)
    - [`activated` - Aguarde a ativação dos eventos](#activated---aguarde-a-ativação-dos-eventos)
    - [`context` - Obtenha o contexto desencadeador dos eventos](#context---obtenha-o-contexto-desencadeador-dos-eventos)
    - [`mutated`, `mutations` - Rastreamento de alterações de dados](#mutated-mutations---rastreamento-de-alterações-de-dados)
  - [`observe` - Observe alterações de valor em tempo real](#observe---observe-alterações-de-valor-em-tempo-real)
  - [`Query` - Consultando dados](#query---consultando-dados)
    - [`Query.find` - Limitando dados de resultados de consulta](#queryfind---limitando-dados-de-resultados-de-consulta)
    - [`Query.remove` - Removendo dados com uma consulta](#queryremove---removendo-dados-com-uma-consulta)
    - [`Query.count` - Contando resultados da consulta](#querycount---contando-resultados-da-consulta)
    - [`Query.exists` - Verificando a existência do resultado da consulta](#queryexists---verificando-a-existência-do-resultado-da-consulta)
    - [`Query.forEach` - Resultados da consulta de streaming](#queryforeach---resultados-da-consulta-de-streaming)
    - [`Query.on` - Consultas em tempo real](#queryon---consultas-em-tempo-real)
  - [`reflect` - API de reflexão](#reflect---api-de-reflexão)
    - [`info` - Obtenha informações sobre um nó](#info---obtenha-informações-sobre-um-nó)
    - [`children` - Obtenha filhos de um nó](#children---obtenha-filhos-de-um-nó)
- [`getAuth` - API de autenticação](#getauth---api-de-autenticação)
  - [`ready` - Evento de inicialização](#ready---evento-de-inicialização)
  - [`createUserWithEmailAndPassword` - Criar usuário com e-mail e senha](#createuserwithemailandpassword---criar-usuário-com-e-mail-e-senha)
  - [`createUserWithUsernameAndPassword` - Criar usuário com nome de usuário e senha](#createuserwithusernameandpassword---criar-usuário-com-nome-de-usuário-e-senha)
  - [`signInWithEmailAndPassword` - Login com e-mail e senha](#signinwithemailandpassword---login-com-e-mail-e-senha)
  - [`signInWithUsernameAndPassword` - Login com nome de usuário e senha](#signinwithusernameandpassword---login-com-nome-de-usuário-e-senha)
  - [`signInWithToken` - Login com token](#signinwithtoken---login-com-token)
  - [`signOut` - Logout](#signout---logout)
  - [`onAuthStateChanged` - Observar mudanças de autenticação](#onauthstatechanged---observar-mudanças-de-autenticação)
  - [`onIdTokenChanged` - Observar mudanças de token](#onidtokenchanged---observar-mudanças-de-token)
  - [`updateCurrentUser` - Atualizar usuário atual](#updatecurrentuser---atualizar-usuário-atual)
  - [`sendPasswordResetEmail` - Enviar e-mail de redefinição de senha](#sendpasswordresetemail---enviar-e-mail-de-redefinição-de-senha)
  - [`applyActionCode` - Aplicar código de ação](#applyactioncode---aplicar-código-de-ação)
  - [`checkActionCode` - Verificar código de ação](#checkactioncode---verificar-código-de-ação)
  - [`confirmPasswordReset` - Confirmar redefinição de senha](#confirmpasswordreset---confirmar-redefinição-de-senha)
  - [`verifyPasswordResetCode` - Verificar código de redefinição de senha](#verifypasswordresetcode---verificar-código-de-redefinição-de-senha)
  - [`User` - Informações do usuário autenticado](#user---informações-do-usuário-autenticado)
    - [`User.accessToken` - Token de acesso](#useraccesstoken---token-de-acesso)
    - [`User.providerData` - Dados do provedor](#userproviderdata---dados-do-provedor)
    - [`User.updateProfile` - Atualizar perfil](#userupdateprofile---atualizar-perfil)
    - [`User.updateEmail` - Atualizar e-mail](#userupdateemail---atualizar-e-mail)
    - [`User.updatePassword` - Atualizar senha](#userupdatepassword---atualizar-senha)
    - [`User.updateUsername` - Atualizar nome de usuário](#userupdateusername---atualizar-nome-de-usuário)
    - [`User.sendEmailVerification` - Enviar verificação de e-mail](#usersendemailverification---enviar-verificação-de-e-mail)
    - [`User.delete` - Deletar usuário](#userdelete---deletar-usuário)
    - [`User.getIdToken` - Obter token de ID](#usergetidtoken---obter-token-de-id)
    - [`User.getIdTokenResult` - Obter resultado do token de ID](#usergetidtokenresult---obter-resultado-do-token-de-id)
    - [`User.reload` - Recarregar usuário](#userreload---recarregar-usuário)
    - [`User.toJSON` - Converter para JSON](#usertojson---converter-para-json)
    - [`User.fromJSON` - Converter de JSON](#userfromjson---converter-de-json)
- [`getStorage` - API de armazenamento em nuvem](#getstorage---api-de-armazenamento-em-nuvem)
- [`getFunctions` - API para funções de nuvem](#getfunctions---api-para-funções-de-nuvem)
- [`getExtensions` - API para extensões de nuvem](#getextensions---api-para-extensões-de-nuvem)
- [`CustomStorage` - Armazenamento personalizado](#customstorage---armazenamento-personalizado)
  - [Armazenamento `Map` (`DataStorageSettings`)](#armazenamento-map-datastoragesettings)
  - [Conexão ao MongoDB (`MongodbSettings`)](#conexão-ao-mongodb-mongodbsettings)
  - [Arquivo local JSON (`JsonFileStorageSettings`)](#arquivo-local-json-jsonfilestoragesettings)

## Começando

O iVipBase está dividido em dois pacotes:

-   **ivipbase**: mecanismo de banco de dados iVipBase local, ponto de extremidade do servidor para permitir conexões remotas. Inclui autenticação e autorização de usuário integradas, suporta o uso de provedores externos OAuth, como Facebook e Google ([github](https://github.com/ivipservices/ivipbase), [npm](https://www.npmjs.com/package/ivipbase))
-   **ivipbase-core**: funcionalidades compartilhadas, dependência do pacote acima ([github](https://github.com/ivipservices/ivipbase-core), [npm](https://www.npmjs.com/package/ivipbase-core))

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

```typescript
import { initializeApp, getDatabase } from "ivipbase";

const app = initializeApp({ dbname: "my_db" });

const db = getDatabase(app);
db.ready(() => {
    // Do stuff
});
```

### Experimente o iVipBase no seu navegador

Se você quiser experimentar o iVipBase em execução no Node.js, basta abri-lo no [RunKit](https://npm.runkit.com/ivipbase) e seguir os exemplos. Se você quiser experimentar a versão do iVipBase para o navegador, abra [google.com](google.com) em uma nova guia (o GitHub não permite que scripts entre sites sejam carregados) e execute o trecho de código abaixo para usá-lo imediatamente no console do seu navegador.

_Para experimentar o iVipBase no RunKit:_

```js
const { initializeApp, getDatabase } = require("ivipbase");

const app = initializeApp({ dbname: "my_db" });

const db = getDatabase(app);
db.ready(async () => {
    await db.ref("test").set({ text: "This is my first iVipBase test in RunKit" });

    const snap = await db.ref("test/text").get();
    console.log(`value of "test/text": ` + snap.val());
});
```

_Para experimentar o iVipBase no console do navegador:_

```js
await fetch("https://cdn.jsdelivr.net/npm/ivipbase@latest/dist/browser.min.js")
    .then((response) => response.text())
    .then((text) => eval(text));

if (!ivipbase) {
    throw "iVipBase not loaded!";
}

const app = ivipbase.initializeApp({ dbname: "my_db" });

const db = ivipbase.getDatabase(app);
db.ready(async () => {
    await db.ref("test").set({ text: "This is my first iVipBase test in the browser" });

    const snap = await db.ref("test/text").get();
    console.log(`value of "test/text": ` + snap.val());
});
```


# `initializeApp` - Inicialização

Para iniciar a aplicação, é essencial empregar a função `initializeApp` e configurar suas opções. Essa função é responsável por criar uma instância da classe `IvipBaseApp`, oferecendo a flexibilidade de personalizar suas configurações. Vale notar que algumas definições podem variar de acordo com o contexto da aplicação, especificamente no que se refere à distinção entre aplicações web e de servidor.

Em cenários voltados para aplicações web, determinadas configurações direcionadas à criação de servidores podem não ser aplicáveis. No contexto de aplicações web, as definições se concentram principalmente em aspectos como armazenamento personalizado (utilizando `CustomStorage` ou configurações pré-existentes para o ambiente web) ou uso remoto.

Para a utilização remota, torna-se obrigatório especificar as definições de `host`, `port` e `dbname`. Além disso, é fundamental que uma instância de `IvipBaseApp` configurada como servidor esteja em execução para estabelecer a conexão entre o servidor e o cliente. Sem essa instância em execução, as definições remotas não serão eficazes.

## Uso

```typescript
/**
 * Inicializa o IvipBaseApp com as opções fornecidas.
 * @param options Objeto JSON contendo configurações para personalizar o aplicativo.
 * @returns Uma instância de IvipBaseApp.
 */
function initializeApp(options: Record<string, any>): IvipBaseApp;
```

| Parâmetro | Tipo     | Descrição                                                                                    |
| --------- | -------- | -------------------------------------------------------------------------------------------- |
| options   | `object` | Objeto (instância `IvipBaseSettings`) contendo configurações para personalizar o aplicativo. |

## Contexto de aplicação web e/ou client

As configurações no contexto de aplicação web são permitidas apenas para personalização do armazenamento (utilizando [`CustomStorage`](#armazenamento-personalizado-customstorage) ou configurações já existentes para o ambiente web) ou para uso remoto. Como mencionado anteriormente, no caso do uso remoto, as definições de `host`, `port` e `dbname` tornam-se obrigatórias para estabelecer a comunicação com o servidor.

### Opções do Objeto `options`

| Propriedade | Tipo                                     | Descrição                                                                                                                                                |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | `string`                                 | O nome do aplicativo.                                                                                                                                    |
| dbname      | `string`                                 | O nome do banco de dados.                                                                                                                                |
| logLevel    | `"log" \| "warn" \| "error"`             | O nível de log para o aplicativo.                                                                                                                        |
| storage     | `CustomStorage` \| `DataStorageSettings` | Configurações de armazenamento para o aplicativo. Consulte [armazenamento presonalizado com `CustomStorage`](#armazenamento-personalizado-customstorage) |
| host        | `string \| undefined`                    | O endereço do host, se aplicável.                                                                                                                        |
| port        | `number \| undefined`                    | O número da porta, se aplicável.                                                                                                                         |

Certifique-se de ajustar o exemplo de uso para refletir o formato do objeto `options` esperado:

```typescript
import { initializeApp } from "ivipbase";

const configuracoesApp = {
    host: "0.0.0.0",
    port: 8080,
    dbname: "bancoCustomizado",
    logLevel: "error",
    // ... outras opções
};

const app = initializeApp(configuracoesApp);

app.ready(()=>{
    console.log("App iniciado!");
});
```

## Contexto de aplicação servidor

Para o contexto de uma aplicação servidor, é necessário definir opções associadas ao funcionamento do aplicativo servidor, permitindo a comunicação remota com a aplicação web (cliente). Especificamente, a opção `isServer` deve ser configurada para indicar que a aplicação é um servidor, juntamente com `host`, `port`, `storage` e `dbname`. Explore também outras opções adicionais disponíveis para personalizar a aplicação.

### Opções do Objeto `options`

| Propriedade    | Tipo                                                                                       | Descrição                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| isServer       | `boolean`                                                                                  | Define se será uma aplicação remota ou servidor.                                                                                                                                                                                                                                                |
| email          | `object`                                                                                   | Configurações de e-mail para habilitar o envio de e-mails pelo iVipServer, por exemplo, para boas-vindas, redefinição de senhas, notificações de logins, etc.                                                                                                                                   |
| logLevel       | `"verbose" \| "log" \| "warn" \| "error"`                                                  | Nível de mensagens registradas no console.                                                                                                                                                                                                                                                      |
| host           | `string`                                                                                   | IP ou nome do host para iniciar o servidor.                                                                                                                                                                                                                                                     |
| port           | `number`                                                                                   | Número da porta em que o servidor estará ouvindo.                                                                                                                                                                                                                                               |
| storage        | `CustomStorage` \| `DataStorageSettings` \| `MongodbSettings` \| `JsonFileStorageSettings` | Configurações de armazenamento para o aplicativo. Consulte [armazenamento presonalizado com `CustomStorage`](#armazenamento-personalizado-customstorage)                                                                                                                                        |
| rootPath       | `string`                                                                                   | Caminho raiz para as rotas do iVipBase.                                                                                                                                                                                                                                                         |
| maxPayloadSize | `string`                                                                                   | Tamanho máximo permitido para dados enviados, por exemplo, para atualizar nós. O padrão é '10mb'.                                                                                                                                                                                               |
| allowOrigin    | `string`                                                                                   | Valor a ser usado para o cabeçalho CORS Access-Control-Allow-Origin. O padrão é '\*'.                                                                                                                                                                                                           |
| trustProxy     | `boolean`                                                                                  | Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente.                                                                                                                                                                                             |
| authentication | `object`                                                                                   | Configurações que definem se e como a autenticação é utilizada.                                                                                                                                                                                                                                 |
| init           | `(server: any) => Promise<void>`                                                           | Função de inicialização que é executada antes do servidor adicionar o middleware 404 e começar a ouvir chamadas recebidas. Utilize esta função de retorno de chamada para estender o servidor com rotas personalizadas, adicionar regras de validação de dados, aguardar eventos externos, etc. |
| rulesData      | `object`                                                                                   | Dados iniciais para regras de acesso de banco de dados.                                                                                                                                                                                                                                         |

#### Opções do Objeto `options.email`

| Propriedade  | Tipo                                                                     | Descrição                                                        |
| ------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| server       | `object`                                                                 | Configurações do servidor de e-mail.                             |
| prepareModel | `(request: any) => { title: string; subject: string; message: string; }` | Função opcional para preparar o modelo de e-mail antes do envio. |

#### Opções do Objeto `options.email.server`

| Propriedade | Tipo                  | Descrição                                                                                                                                                                                                                                                                                          |
| ----------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| host        | `string`              | O nome do host ou endereço IP ao qual se conectar (o padrão é ‘localhost’).                                                                                                                                                                                                                        |
| port        | `number`              | A porta à qual se conectar (o padrão é 587 se seguro for falso ou 465 se verdadeiro).                                                                                                                                                                                                              |
| type        | `"login" \| "oauth2"` | O tipo de autenticação, padrão é ‘login’, outra opção é ‘oauth2’.                                                                                                                                                                                                                                  |
| user        | `string`              | O nome de usuário de login.                                                                                                                                                                                                                                                                        |
| pass        | `string`              | A senha do usuário se o login normal for usado.                                                                                                                                                                                                                                                    |
| secure      | `boolean`             | Indica se a conexão usará TLS ao conectar-se ao servidor. Se for falso (o padrão), então o TLS será usado se o servidor suportar a extensão STARTTLS. Na maioria dos casos, defina esse valor como verdadeiro se você estiver se conectando à porta 465. Para a porta 587 ou 25, mantenha-o falso. |

### Opções do Objeto `options.authentication`

| Propriedade          | Tipo                          | Descrição                                                                                                                                                                                                                                                                                            |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| enabled              | `boolean`                     | Se a autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado).                                                                                                                                                       |
| allowUserSignup      | `boolean`                     | Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador.                                                                                                                                                                                                      |
| newUserRateLimit     | `number`                      | Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda.                                                                                                                                                                                                          |
| tokensExpire         | `number`                      | Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.                                                                                                                                                                                                                          |
| defaultAccessRule    | `"deny" \| "allow" \| "auth"` | Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa). |
| defaultAdminPassword | `string \| undefined`         | Quando o servidor é executado pela primeira vez, qual senha usar para o usuário administrador. Se não fornecida, uma senha gerada será usada e mostrada UMA VEZ na saída do console.                                                                                                                 |
| separateDb           | `boolean \| "v2"`             | Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!                                                                                                                                                                     |

Certifique-se de ajustar o exemplo de uso para refletir o formato do objeto `options` esperado:

```typescript
import { initializeApp, MongodbSettings } from "ivipbase";

const configuracoesApp = {
    isServer: true,
    host: "0.0.0.0",
    port: 8080,
    dbname: "bancoCustomizado",
    logLevel: "error",
    allowOrigin: "*",
    storage: new MongodbSettings({
        host: "0.0.0.0",
        port: 27017,
        username: "admin",
        password: "1234",
    }),
    // ... outras opções
};

const app = initializeApp(configuracoesApp);

app.ready(()=>{
    console.log("App iniciado!");
});
```

NOTA: A opção `logLevel` especifica quanto de informação deve ser gravado nos logs do console. Os valores possíveis são: `'verbose'`, `'log'` (padrão), `'warn'` e `'error'` (apenas erros são registrados)

# `getDatabase` - API banco de dados

A API é semelhante à do banco de dados em tempo real do Firebase e AceBase, com adições. Para utilizá-la, será necessário empregar a função `getDatabase`. Essa função é responsável por configurar a API de consumo com as predefinições no `initializeApp`. Requer um parâmetro, no qual você pode inserir a instância obtida por meio da função `initializeApp`, criando uma instância da classe `IvipBaseApp` ou uma string do nome da aplicação específica. Caso o parâmetro não seja fornecido, o `getDatabase` considerará a primeira aplicação criada ou a aplicação padrão, se houver. Abaixo, seguem dois exemplos de uso do `getDatabase`:

```typescript
import { initializeApp, getDatabase } from "ivipbase";

const app = initializeApp({
    dbname: "mydb", // Cria ou abre um banco de dados com o nome "mydb"
    logLevel: "log",
    // ... outras opções
});

const db = getDatabase(app);
db.ready(() => {
    // o banco de dados está pronto para uso!
});
```

Neste exemplo, o `getDatabase` considera a aplicação padrão ou a primeira aplicação criada com um nome definido.

```typescript
import { getDatabase } from "ivipbase";

const db = getDatabase();
db.ready(() => {
    // o banco de dados está pronto para uso!
});
```

## `get` - Carregando dados

Execute `.get` em uma referência para obter o valor armazenado atualmente. É a abreviação da sintaxe do Firebase de `.once("value")`.

```typescript
const snapshot = await db.ref("game/config").get();
if (snapshot.exists()) {
    config = snapshot.val();
} else {
    config = defaultGameConfig; // use defaults
}
```

Observação: ao carregar dados, o valor atualmente armazenado será agrupado e retornado em um objeto `DataSnapshot`. Use `snapshot.exists()` para determinar se o nó existe, `snapshot.val()` para obter o valor.

## `set` - Armazenando dados

Definindo o valor de um nó, substituindo se existir:

```typescript
const ref = await db.ref('game/config').set({
    name: 'Name of the game',
    max_players: 10
});
// stored at /game/config
```

Observação: ao armazenar dados, não importa se o caminho de destino e/ou os caminhos pai já existem. Se você armazenar dados em 'chats/somechatid/messages/msgid/receipts', qualquer nó inexistente será criado nesse caminho.

## `update` - Atualizando dados

A atualização do valor de um nó mescla o valor armazenado com o novo objeto. Se o nó de destino não existir, ele será criado com o valor passado.

```typescript
const ref = await db.ref("game/config").update({
    description: "The coolest game in the history of mankind",
});

// config was updated, now get the value (ref points to 'game/config')
const snapshot = await ref.get();
const config = snapshot.val();

// `config` now has properties "name", "max_players" and "description"
```

## `remove`, `null` - Removendo dados

Você pode `remover` dados com o remove método

```typescript
db.ref('animals/dog')
    .remove()
    .then(() => { /* removed successfully */ )};
```

A remoção de dados também pode ser feita definindo ou atualizando seu valor para `null`. Qualquer propriedade que tenha um valor nulo será removida do nó do objeto pai.

```typescript
// Remove by setting it to null
db.ref('animals/dog')
    .set(null)
    .then(ref => { /* dog property removed */ )};

// Or, update its parent with a null value for 'dog' property
db.ref('animals')
    .update({ dog: null })
    .then(ref => { /* dog property removed */ )};
```

<a id="Gerando"></a>

## `push` - Gerando chaves exclusivas

Para todos os dados genéricos adicionados, você precisa criar chaves que sejam exclusivas e que não entrem em conflito com chaves geradas por outros clientes. Para fazer isso, você pode gerar chaves exclusivas com `push`. Nos bastidores, push usa [cuid](https://www.npmjs.com/package/cuid) para gerar chaves que são garantidamente exclusivas e classificáveis ​​no tempo.

```typescript
db.ref('users')
    .push({
        name: 'Ewout',
        country: 'The Netherlands'
    })
    .then(userRef => {
        // user is saved, userRef points to something
        // like 'users/jld2cjxh0000qzrmn831i7rn'
    };
```

O exemplo acima gera a chave exclusiva e armazena o objeto imediatamente. Você também pode optar por gerar a chave, mas armazenar o valor posteriormente.

```typescript
const postRef = db.ref('posts').push();
console.log(`About to add a new post with key "${postRef.key}"..`);
// ... do stuff ...
postRef.set({
        title: 'My first post'
    })
    .then(ref => {
        console.log(`Saved post "${postRef.key}"`);
    };
```

**OBSERVAÇÃO:** essa abordagem é recomendada se você quiser adicionar vários objetos novos de uma vez, porque uma única atualização tem um desempenho muito mais rápido:

```typescript
const newMessages = {};
// We got messages from somewhere else (eg imported from file or other db)
messages.forEach(message => {
    const ref = db.ref('messages').push();
    newMessages[ref.key] = message;
})
console.log(`About to add multiple messages in 1 update operation`);
db.ref('messages').update(newMessages)
    .then(ref => {
        console.log(`Added all messages at once`);
    };
```

## `Array` - Usando matrizes

IvipBase suporta armazenamento de arrays, mas há algumas ressalvas ao trabalhar com eles. Por exemplo, você não pode remover ou inserir itens que não estejam no final do array. Os arrays IvipBase funcionam como uma pilha, você pode adicionar e remover do topo, não de dentro. No entanto, é possível editar entradas individuais ou substituir todo o array. A maneira mais segura de editar arrays é com `transaction`, que exige que todos os dados sejam carregados e armazenados novamente. Em muitos casos, é mais sensato usar coleções de objetos.

Você pode usar matrizes com segurança quando:

- O número de itens é pequeno e finito, o que significa que você pode estimar o número médio típico de itens nele.
- Não há necessidade de recuperar/editar itens individuais usando seu caminho armazenado. Se você reordenar os itens em uma matriz, seus caminhos mudam (por exemplo, de `"playlist/songs[4]"` para `"playlist/songs[1]")`
- As entradas armazenadas são pequenas e não possuem muitos dados aninhados (strings pequenas ou objetos simples, por exemplo: chat/members com matriz de IDs de usuário `['ewout','john','pete']` )
- A coleção não precisa ser editada com frequência.

Use coleções de objetos quando:

- A coleção continua crescendo (por exemplo: conteúdo gerado pelo usuário)
- O caminho dos itens é importante e de preferência não muda, por exemplo, `"playlist/songs[4]"` pode apontar para uma entrada diferente se o array for editado. Ao usar uma coleção de objetos, `playlist/songs/jld2cjxh0000qzrmn831i7rn` sempre se referirá ao mesmo item.
- As entradas armazenadas são grandes (por exemplo, strings/blobs/objetos grandes com muitos dados aninhados)
  Você precisa editar a coleção com frequência.

Dito isto, veja como trabalhar com arrays com segurança:

```typescript
// Store an array with 2 songs:
await db.ref('playlist/songs').set([
    { id: 13535, title: 'Daughters', artist: 'John Mayer' },
    { id: 22345,  title: 'Crazy', artist: 'Gnarls Barkley' }
]);

// Editing an array safely:
await db.ref('playlist/songs').transaction(snap => {
    const songs = snap.val();
    // songs is instanceof Array
    // Add a song:
    songs.push({ id: 7855, title: 'Formidable', artist: 'Stromae' });
    // Edit the second song:
    songs[1].title += ' (Live)';
    // Remove the first song:
    songs.splice(0, 1);
    // Store the edited array:
    return songs;
});
```

Se você não alterar a ordem das entradas em um array, é seguro usá-las em caminhos referenciados:

```typescript
// Update a single array entry:
await db.ref('playlist/songs[4]/title').set('Blue on Black');

// Or:
await db.ref('playlist/songs[4]').update({ title: 'Blue on Black') };

// Or:
await db.ref('playlist/songs').update({
    4: { title: 'Blue on Black', artist: 'Kenny Wayne Shepherd' }
})

// Get value of single array entry:
let snap = await db.ref('playlist/songs[2]').get();

// Get selected entries with an include filter (like you'd use with object collections)
let snap = await db.ref('playlist/songs').get({ include: [0, 5, 8] });
let songs = snap.val();
// NOTE: songs is instanceof PartialArray, which is an object with properties '0', '5', '8'
```

NOTA: você NÃO PODE usar `ref.push()` para adicionar entradas a um array! push só pode ser usado em coleções de objetos porque gera IDs filho exclusivos, como `"jpx0k53u0002ecr7s354c51l"` (que obviamente não é um índice de array válido)

Para resumir: use arrays SOMENTE se usar uma coleção de objetos parecer um exagero e seja muito cauteloso! Adicionar e remover itens só pode ser feito de/para o FIM de um array, a menos que você reescreva o array inteiro. Isso significa que você terá que saber antecipadamente quantas entradas seu array possui para poder adicionar novas entradas, o que não é realmente desejável na maioria das situações. Se você sentir necessidade de usar um array porque a ordem das entradas é importante para você ou seu aplicativo: considere usar uma coleção de objetos e adicione uma 'ordem' propriedade às entradas nas quais realizar uma classificação.

## `count` - Contando filhos

Para descobrir rapidamente quantos filhos um nó específico possui, use o count método em um `DataReference`:

```typescript
const messageCount = await db.ref('chat/mensagens'< a i=9>).count();
```

## `include`, `exclude` - Limitar o carregamento de dados aninhados

Se a estrutura do seu banco de dados estiver usando aninhamento (por exemplo, armazenando postagens em `'users/someuser/posts'` em vez de em `'posts'`), talvez você queira limitar a quantidade de dados que você estão recuperando na maioria dos casos. Por exemplo: se você deseja obter os detalhes de um usuário, mas não deseja carregar todos os dados aninhados, você pode limitar explicitamente a recuperação de dados aninhados passando `exclude`, include e/ou `child_objects` opções para `.get`:

```typescript
// Exclude specific nested data:
db.ref('users/someuser')
    .get({ exclude: ['posts', 'comments'] })
    .then(snap => {
        // snapshot contains all properties of 'someuser' except
        // 'users/someuser/posts' and 'users/someuser/comments'
    });

// Include specific nested data:
db.ref('users/someuser/posts')
    .get({ include: ['*/title', '*/posted'] })
    .then(snap => {
        // snapshot contains all posts of 'someuser', but each post
        // only contains 'title' and 'posted' properties
    });

// Combine include & exclude:
db.ref('users/someuser')
    .get({ exclude: ['comments'], include: ['posts/*/title'] })
    .then(snap => {
        // snapshot contains all user data without the 'comments' collection,
        // and each object in the 'posts' collection only contains a 'title' property.
    });
```

**OBSERVAÇÃO:** isso permite que você faça o que o Firebase não consegue: armazenar seus dados em locais lógicos e obter apenas os dados de seu interesse, rapidamente.

## `forEach` - Iterando filhos

Para iterar todos os filhos de uma coleção de objetos sem carregar todos os dados na memória de uma só vez, você pode usar `forEach` que transmite cada filho e executa uma função de retorno de chamada com um instantâneo de seus dados. Se a função de retorno de chamada retornar `false`, a iteração será interrompida. Se o retorno de chamada retornar um Promise, a iteração aguardará a resolução antes de carregar o próximo filho.

Os filhos a serem iterados são determinados no início da função. Como `forEach` não bloqueia a leitura/gravação da coleção, é possível que os dados sejam alterados durante a iteração. Os filhos adicionados durante a iteração serão ignorados, os filhos removidos serão ignorados.

Também é possível carregar dados seletivamente para cada filho, utilizando o mesmo objeto de opções disponível `pararef.get(options)`

Exemplos:

```typescript
// Transmita todos os 'books', um de cada vez (carrega todos os dados de cada 'books'):
await db.ref('books').forEach(bookSnapshot => {
   const book = bookSnapshot.val();
   console.log(`Got book "${book.title}": "${book.description}"`);
});

// Agora faça o mesmo, mas carregue apenas 'title' e 'description' de cada 'books':
await db.ref('books').forEach(
    { include: ['title', 'description'] },
    bookSnapshot => {
        const book = bookSnapshot.val();
        console.log(`Got book "${book.title}": "${book.description}"`);
    }
);
```

## `TypeScript` - Afirmando tipos de dados

Se estiver usando TypeScript, você pode passar um parâmetro de tipo para a maioria dos métodos de recuperação de dados que declararão o tipo do valor retornado. Observe que você é responsável por garantir que o valor corresponda ao tipo declarado em tempo de execução.

Exemplos:

```typescript
const snapshot = await db.ref<MyClass>('users/someuser/posts').get<MyClass>();
//                            ^ parâmetro de tipo pode ir aqui,    ^ aqui,
if (snapshot.exists()) {
    config = snapshot.val<MyClass>();
    //                    ^ ou aqui
}

// Um parâmetro de tipo também pode ser usado para afirmar o tipo de um parâmetro de retorno de chamada
await db.ref('users/someuser/posts')
    .transaction<MyClass>(snapshot => {
        const posts = snapshot.val(); // postagens são do tipo MyClass
        return posts;
    })

// Ou ao iterar sobre filhos
await db.ref('users').forEach<UserClass>(userSnapshot => {
    const user = snapshot.val(); // o usuário é do tipo UserClass
})
```

## `on`, `off` - Monitorando alterações de dados em tempo real

Você pode assinar eventos de dados para receber notificações em tempo real à medida que o nó monitorado é alterado. Quando conectado a um servidor iVipBase remoto, os eventos serão enviados aos clientes por meio de uma conexão websocket. Os eventos suportados são:

-   `'value'`: acionado quando o valor de um nó muda (incluindo alterações em qualquer valor filho)
-   `'child_added'`: acionado quando um nó filho é adicionado, o retorno de chamada contém um instantâneo do nó filho adicionado
-   `'child_changed'`: acionado quando o valor de um nó filho é alterado, o retorno de chamada contém um instantâneo do nó filho alterado
-   `'child_removed'`: acionado quando um nó filho é removido, o retorno de chamada contém um instantâneo do nó filho removido
-   `'mutated'`: acionado quando qualquer propriedade aninhada de um nó é alterada, o retorno de chamada contém um instantâneo e uma referência da mutação exata.
-   `'mutations'`: como `mutated`, mas dispara com uma matriz de todas as mutações causadas por uma única atualização do banco de dados.
-   `'notify_*'`: versão apenas para notificação dos eventos acima sem dados, consulte "Notificar apenas eventos" abaixo

```typescript
// Usando retorno de chamada de evento
db.ref('users')
    .on('child_added', userSnapshot => {
        // dispara para todos os filhos atuais,
        // e para cada novo usuário a partir de então
    });

```

```typescript
// Para poder cancelar a assinatura mais tarde:
function userAdded(userSnapshot) { /* ... */ }
db.ref('users').on('child_added', userAdded);
// Cancele a inscrição mais tarde com .off:
db.ref('users').off('child_added', userAdded);
```

iVipBase usa as mesmas assinaturas de método `.on` e `.off` do Firebase e Acebase, mas também oferece outra maneira de assinar os eventos usando o retornado. `EventStream` você pode `subscribe`. Ter uma assinatura ajuda a cancelar mais facilmente a inscrição nos eventos posteriormente. Além disso, subscribe os retornos de chamada são acionados apenas para eventos futuros por padrão, ao contrário do .on retorno de chamada, que também é acionado para valores atuais de eventos `'value'` e `'child_added'`:

```typescript
// Usando .subscribe
const addSubscription = db.ref('users')
    .on('child_added')
    .subscribe(newUserSnapshot => {
        // .subscribe only fires for new children from now on
    });

const removeSubscription = db.ref('users')
    .on('child_removed')
    .subscribe(removedChildSnapshot => {
        //removedChildSnapshot contém os dados removidos
        // NOTA: snapshot.exists() retornará falso,
        // e snapshot.val() contém o valor filho removido
    });

const changesSubscription = db.ref('users')
    .on('child_changed')
    .subscribe(updatedUserSnapshot => {
        // Obteve um novo valor para um objeto de usuário atualizado
    });

// Interrompendo todas as assinaturas posteriormente:
addSubscription.stop();
removeSubscription.stop();
changesSubscription.stop();
```

Se você quiser usar `.subscribe` enquanto também obtém retornos de chamada de dados existentes, passe `true` como argumento de retorno de chamada:

```typescript
db.ref('users/some_user')
    .on('value', true) //passando true triggers .subscribe retorno de chamada para o valor atual também
    .subscribe(userSnapshot => {
        // Obteve o valor atual (1ª chamada) ou o novo valor (2ª + chamada) para some_user
    });
```

O `EventStream` retornado por `.on` também pode ser usado para `subscribe` mais de uma vez:

```typescript
const newPostStream = db.ref('posts').on('child_added');
const subscription1 = newPostStream.subscribe(childSnapshot => { /* faça alguma coisa */ });
const subscription2 = newPostStream.subscribe(childSnapshot => { /* faço outra coisa */ });
// Para interromper a assinatura de 1:
subscription1.stop();
// ou, para interromper todas as assinaturas ativas:
newPostStream.stop();
```

Se estiver usando TypeScript, você pode passar um parâmetro de tipo para `.on` ou para `.subscribe` para declarar o tipo do valor armazenado no instantâneo. Este tipo não é verificado pelo TypeScript; é sua responsabilidade garantir que o valor armazenado corresponda à sua afirmação.

```typescript
const newPostStream = db.ref('posts').on<MyClass>('child_added');
const subscription1 = newPostStream.subscribe(childSnapshot => {
    const child = childSnapshot.val(); // filho é do tipo MyClass
});
const subscription2 = newPostStream.subscribe<MyOtherClass>(childSnapshot => {
    const child = childSnapshot.val(); // filho é do tipo MyOtherClass
    // .subscribe substituiu o parâmetro de tipo de .on
});
```

### `*`, `$` - Utilizando variáveis e curingas em caminhos de assinatura

Também é possível se inscrever em eventos usando curingas e variáveis no caminho:

```typescript
// Utilizando curingas:
db.ref('usuários/*/posts')
    .on('child_added')
    .subscribe(snap => {
        // Isso será acionado para cada postagem adicionada por qualquer usuário,
        // então, para o nosso exemplo .push, este será o resultado:
        // snap.ref.vars === { 0: "ewout" }
        const vars = snap.ref.vars;
        console.log(`Nova postagem adicionada pelo usuário "${vars[0]}"`);
    });
db.ref('usuários/ewout/posts').push({ title: 'nova postagem' });

// Utilizando variáveis nomeadas:
db.ref('usuários/$userid/posts/$postid/title')
    .on('value')
    .subscribe(snap => {
        // Isso será acionado para cada novo 'title' de postagem ou alterado,
        // então, para o nosso exemplo .push abaixo, este será o resultado:
        // snap.ref.vars === { 0: "ewout", 1: "jpx0k53u0002ecr7s354c51l", userid: "ewout", postid: (...), $userid: (...), $postid: (...) }
        // O ID do usuário estará em vars[0], vars.userid e vars.$userid
        const title = snap.val();
        const vars = snap.ref.vars; // contém os valores das variáveis no caminho
        console.log(`O título da postagem ${vars.postid} pelo usuário ${vars.userid} foi definido como: "${title}"`);
    });
db.ref('usuários/ewout/posts').push({ title: 'nova postagem' });

// Ou uma combinação:
db.ref('usuários/*/posts/$postid/title')
    .on('value')
    .subscribe(snap => {
        // snap.ref.vars === { 0: 'ewout', 1: "jpx0k53u0002ecr7s354c51l", postid: "jpx0k53u0002ecr7s354c51l", $postid: (...) }
    });
db.ref('usuários/ewout/posts').push({ título: 'nova postagem' });
```

### `notify_` - Notificar apenas eventos

Além dos eventos mencionados acima, você também pode assinar seus `notify_` equivalentes que fazem o mesmo, mas com uma referência aos dados alterados em vez de um instantâneo. Isto é bastante útil se você deseja monitorar alterações, mas não está interessado nos valores reais. Isso também economiza recursos do servidor e resulta na transferência de menos dados do servidor. Ex: `notify_child_changed` executará seu retorno de chamada com uma referência ao nó alterado:

```typescript
ref.on('notify_child_changed', childRef => {
    console.log(`child "${childRef.key}" changed`);
})
```

### `activated` - Aguarde a ativação dos eventos

Em algumas situações, é útil aguardar que os manipuladores de eventos estejam ativos antes de modificar os dados. Por exemplo, se quiser que um evento seja acionado para alterações que você está prestes a fazer, você deve certificar-se de que a assinatura está ativa antes de realizar as atualizações.

```typescript
const subscription = db.ref('usuários')
    .on('child_added')
    .subscribe(snap => { /*...*/ });

// Utilize a promise ativada
subscription.activated()
    .then(() => {
        // Agora temos certeza de que a assinatura está ativa,
        // adicionar um novo usuário acionará o retorno de chamada .subscribe
        db.ref('usuários').push({ nome: 'Ewout' });
    })
    .catch(err => {
        // Acesso ao caminho negado pelo servidor?
        console.error(`Assinatura cancelada: ${err.message}`);
    });
```

Se você quiser lidar com alterações no estado da assinatura depois que ela foi ativada (por exemplo, porque os direitos de acesso do lado do servidor foram alterados), forneça uma função de retorno de chamada para a chamada `activated`:

```typescript
subscription.activated((activated, cancelReason) => {
    if (!activated) {
        // Access to path denied by server?
        console.error(`Subscription canceled: ${cancelReason}`);
    }
});
```

### `context` - Obtenha o contexto desencadeador dos eventos

Em alguns casos, é benéfico saber o que (e/ou quem) acionou o disparo de um evento de dados, para que você possa escolher o que deseja fazer com as atualizações de dados. Agora é possível passar informações de contexto com todos os `update`, `set`, `remove` e `transaction` operações, que serão repassadas para qualquer evento acionado nos caminhos afetados (em qualquer cliente conectado!)

Imagine a seguinte situação: você tem um editor de documentos que permite que várias pessoas editem ao mesmo tempo. Ao carregar um documento você atualiza sua `last_accessed` propriedade:

```typescript
// Carregar documento e inscrever-se para alterações
db.ref('usuários/ewout/documentos/some_id').on('value', snap => {
    // Documento carregado ou alterado. Exibir seu conteúdo
    const documento = snap.val();
    exibirDocumento(documento);
});

// Definir last_accessed como o horário atual
db.ref('usuários/ewout/documentos/some_id').update({ last_accessed: new Date() });
```

Isso acionará o evento `value` DUAS VEZES e fará com que o documento seja renderizado DUAS VEZES. Além disso, se qualquer outro usuário abrir o mesmo documento, ele será acionado novamente, mesmo que não seja necessário redesenhar!

Para evitar isso, você pode passar informações contextuais com a atualização:

```typescript
// Carregar documento e assinar alterações (contexto sensível!)
db.ref('usuários/ewout/documentos/some_id')
    .on('value', snap => {
        // Documento carregado ou alterado.
        const contexto = snap.context();
        if (contexto.redesenhar === false) {
            // Não é necessário redesenhar!
            return;
        }
        // Exibir seu conteúdo
        const documento = snap.val();
        exibirDocumento(documento);
    });

// Definir last_accessed para o tempo atual, com contexto
db.ref('usuários/ewout/documentos/some_id')
    .context({ redesenhar: false }) // evita redesenhos!
    .update({ last_accessed: new Date() });
```

### `mutated`, `mutations` - Rastreamento de alterações de dados

Esses eventos são usados ​​principalmente pelo iVipBase nos bastidores para atualizar automaticamente os valores na memória com mutações remotas. É possível usar esses eventos sozinho, mas eles exigem alguns detalhes adicionais e provavelmente será melhor usar os métodos mencionados acima.

Dito isto, veja como usá-los:

Se você deseja monitorar o valor de um nó específico, mas não deseja obter todo o seu novo valor toda vez que uma pequena mutação é feita nele, assine a opção `mutated`. Este evento só é acionado quando os dados de destino estão realmente sendo alterados. Isso permite que você mantenha uma cópia em cache de seus dados na memória (ou banco de dados de cache) e replique todas as alterações feitas nele:

```typescript
const chatRef = db.ref('chats/chat_id');
// Obter valor atual
const chat = (await chatRef.get()).val();

// Inscrever-se no evento de mutação
chatRef.on('mutated', snap => {
    const mutatedPath = snap.ref.path; // 'chats/chat_id/messages/message_id'
    const propertyTrail =
        // ['messages', 'message_id']
        mutatedPath.slice(chatRef.path.length + 1).split('/');

    // Navegar até o alvo da propriedade de bate-papo na memória:
    let targetObject = propertyTrail.slice(0,-1).reduce((target, prop) => target[prop], chat);
    // targetObject === chat.messages
    const targetProperty = propertyTrail.slice(-1)[0]; // O último item no array
    // targetProperty === 'message_id'

    // Atualizar o valor do nosso bate-papo na memória:
    const newValue = snap.val(); // { sender: 'Ewout', text: '...' }
    if (newValue === null) {
        // Remover
        delete targetObject[targetProperty]; // delete chat.messages.message_id
    }
    else {
        // Definir ou atualizar
        targetObject[targetProperty] = newValue; // chat.messages.message_id = newValue
    }
});

// Adicionar uma nova mensagem para acionar o manipulador de eventos acima
chatRef.child('messages').push({
    sender: 'Ewout',
    text: 'Enviando uma mensagem para você'
});
```

NOTA: se você estiver conectado a um servidor iVipBase remoto e a conexão for perdida, é importante que você sempre obtenha o valor mais recente ao reconectar, pois você pode ter perdido eventos de mutação.

O evento `mutations` faz o mesmo que `mutated`, mas será acionado no caminho da assinatura com uma matriz de todas as mutações causadas por uma única atualização do banco de dados . A melhor maneira de lidar com essas mutações é iterá-las usando `snapshot.forEach`:

```typescript
chatRef.on('mutations', snap => {
    snap.forEach(mutationSnap => {
        handleMutation(mutationSnap);
    });
})
```

## `observe` - Observe alterações de valor em tempo real

Agora você pode observar o valor em tempo real de um caminho e (por exemplo) vinculá-lo à sua UI. `ref.observe()` retorna um Observable RxJS que pode ser usado para observar atualizações neste nó e seus filhos. Ele não retorna instantâneos, então você pode vincular o observável diretamente à sua UI. O valor observado é atualizado internamente usando a opção `mutated` evento do banco de dados. Todas as mutações do banco de dados são aplicadas automaticamente ao valor na memória e acionam o observável para emitir o novo valor.

```angular
<!-- In your Angular view template: -->
<ng-container *ngIf="liveChat | async as chat">
   <h3>{{ chat.title }}</h3>
   <p>Chat was started by {{ chat.startedBy }}</p>
   <div class="messages">
      <Message *ngFor="let item of chat.messages | keyvalue" [message]="item.value"></Message>
   </div>
</ng-container>
```

Observe que para usar `*ngFor` do Angular em uma coleção de objetos, você deve usar o canal `keyvalue`.

```typescript
// No seu componente Angular:
ngOnInit() {
   this.liveChat = this.db.ref('chats/chat_id').observe();
}
```

Ou, se você quiser monitorar as atualizações por conta própria, faça a inscrição e o cancelamento:

```typescript
ngOnInit() {
    this.observer = this.db.ref('chats/chat_id').observe().subscribe(chat => {
        this.chat = chat;
    });
}
ngOnDestroy() {
   // NÃO se esqueça de cancelar a inscrição!
   this.observer.unsubscribe();
}
```

NOTA: os objetos retornados no observável são atualizados apenas no downstream - quaisquer alterações feitas localmente não serão atualizadas no banco de dados.

## `Query` - Consultando dados

Ao executar uma consulta, todos os nós filhos do caminho referenciado serão comparados com os critérios definidos e retornados em qualquer ordem `sort` solicitada. A paginação de resultados também é suportada, portanto você pode `skip` e `take` qualquer número de resultados.

Para filtrar resultados, diversas instruções `filter(key, operator, compare)` podem ser adicionadas. Os resultados filtrados devem corresponder a todas as condições definidas (E lógico). Os operadores de consulta suportados são:

-   `"<"`: o valor deve ser menor quecompare
-   `"<="`: o valor deve ser menor ou igual acompare
-   `"=="`: o valor deve ser igual acompare
-   `"!="`: o valor não deve ser igual acompare
-   `">"`: o valor deve ser maior quecompare
-   `">="`: o valor deve ser maior ou igual acompare
-   `"exists"`: key deve existir
-   `"!exists"`: key não deve existir
-   `"between"`: o valor deve estar entre os 2 valores no compare array (compare[0] <= valor <= compare[1] ). Se compare[0] > compare[1], seus valores serão trocados
-   `"!between"`: o valor não deve estar entre os 2 valores em compare array (valor < compare[0] ou valor > compare[1]). Se compare[0] > compare[1], seus valores serão trocados
-   `"like"`: o valor deve ser uma string e deve corresponder ao padrão fornecido compare. Os padrões não diferenciam maiúsculas de minúsculas e podem conter curingas _ para 0 ou mais caracteres e ?"Th?"< a i=5> para 1 caractere. (padrão corresponde a "The", não "That"; padrão "Th_" corresponde a "the" e "That")
-   `"!like"`: o valor deve ser uma string e não deve corresponder ao padrão fornecidocompare
-   `"matches"`: o valor deve ser uma string e deve corresponder à expressão regularcompare
-   `"!matches"`: o valor deve ser uma string e não deve corresponder à expressão regularcompare
-   `"in"`: o valor deve ser igual a um dos valores em compare array
-   `"!in"`: o valor não deve ser igual a nenhum valor na compare matriz
-   `"has"`: o valor deve ser um objeto e deve ter propriedade compare.
-   `"!has"`: o valor deve ser um objeto e não deve ter propriedadecompare
-   `"contains"`: o valor deve ser um array e deve conter um valor igual a compare ou conter todos os valores em compare array
-   `"!contains"`: o valor deve ser um array e não deve conter um valor igual a compare, ou não conter nenhum dos valores em compare array
-   NOTA: uma consulta não requer nenhum `filter` critério. Você também pode usar um `query` para paginar seus dados usando `skip`, `take` e `sort`. Se você não especificar nenhum deles, o iVipBase usará `.take`(100) como padrão. Se você não especificar um `sort`, a ordem dos valores retornados poderá variar entre as execuções.

```typescript
db.query('songs')
    .filter('year', 'between', [1975, 2000])
    .filter('title', 'matches', /love/i)   // Músicas com "love" no título
    .take(50)                                  // limitar a 50 resultados
    .skip(100)                                 // pular os primeiros 100 resultados
    .sort('rating', false)            // classificação mais alta primeiro
    .sort('title')                          // ordenar por título ascendente
    .get(snapshots => {
        // ...
    });
```

Para converter rapidamente um array de snapshots nos valores que ele encapsula, você pode chamar `snapshots.getValues().` Este é um método conveniente e útil se você não estiver interessado nos resultados. caminhos ou chaves. Você também pode fazer isso sozinho com `var values = snapshots.map(snap => snap.val()):`

```typescript
db.query('songs')
    .filter('year', '>=', 2018)
    .get(snapshots => {
        const songs = snapshots.getValues();
    });
```

Em vez de usar o retorno de chamada de `.get`, você também pode usar o retornado `Promise`, que é muito útil em cadeias de promessas:

```typescript
    // ... em alguma cadeia de promessas
    .then(fromYear => {
        return db.query('songs')
        .filter('year', '>=', fromYear)
        .get();
    })
    .then(snapshots => {
        // Obteve snapshots da promessa retornada
    })
```

Isso também permite usar ES6 `async / await:`

```typescript
const snapshots = await db.query("songs").filter("year", ">=", fromYear).get();
```

### `Query.find` - Limitando dados de resultados de consulta

Por padrão, as consultas retornarão instantâneos dos nós correspondentes, mas você também pode obter referências apenas passando a opção `{ snapshots: false }` ou usando a nova `.find()` método.

```typescript
// ...
const references = await db.query("songs").filter("genre", "contains", "rock").get({ snapshots: false });

// agora temos apenas as referências, então podemos decidir quais dados carregar
```

Usar o método `find()`:

```typescript
const references = await db.query("songs").filter("genre", "contains", "blues").find();
```

Se quiser que os resultados da sua consulta incluam alguns dados (mas não todos), você pode usar as opções `include` e `exclude` para filtrar os campos nos resultados da consulta retornados por `get`:

```typescript
const snapshots = await db
    .query("songs")
    .filter("title", "like", "Love*")
    .get({ include: ["title", "artist"] });
```

Os instantâneos no exemplo acima conterão apenas o título e de cada música correspondente campos artista. Consulte [Limitar carregamento de dados aninhados](#limitar-o-carregamento-de-dados-aninhados-include-exclude) para obter mais informações sobre filtros `include e exclude`.

### `Query.remove` - Removendo dados com uma consulta

Para remover todos os nós que correspondem a uma consulta, basta chamar `remove` em vez de `get`:

```typescript
db.query("songs")
    .filter("ano", "<", 1950)
    .remove(() => {
        // Antigas músicas removidas
    });

// Ou, com await
await db.query("músicas").filter("ano", "<", 1950).remove();
```

### `Query.count` - Contando resultados da consulta

Para obter uma contagem rápida dos resultados da consulta, você pode usar `.count()`:

```typescript
const count = await db.query("songs").filter("artist", "==", "John Mayer").count();
```

Você pode usar isso em combinação com `skip` e `limit` para verificar se há resultados além do conjunto de dados atualmente carregado:

```typescript
const nextPageSongsCount = await db.query("songs")
    .filter("artist", "==", "John Mayer")
    .skip(100)
    .take(10)
    .count(); // 10: full page, <10: last page.
```

### `Query.exists` - Verificando a existência do resultado da consulta

Para determinar rapidamente se uma consulta tem alguma correspondência, você pode usar `.exists()`:

```typescript
const exists = await db.query("users").filter("email", "==", "me@ivipcoin.com").exists();
```

Assim como count(), você também pode combinar isso com skip e limit.

### `Query.forEach` - Resultados da consulta de streaming

Para iterar pelos resultados de uma consulta sem carregar todos os dados na memória de uma só vez, você pode usar `forEach` que transmite cada filho e executa uma função de retorno de chamada com um instantâneo de seus dados. Se a função de retorno de chamada retornar `false`, a iteração será interrompida. Se o retorno de chamada retornar um `Promise`, a iteração aguardará a resolução antes de carregar o próximo filho.

A consulta será executada no início da função, recuperando referências a todos os filhos correspondentes (não aos seus valores). Depois disso, `forEach` carregará seus valores um de cada vez. É possível que os dados subjacentes sejam alterados durante a iteração. Os filhos correspondentes que foram removidos durante a iteração serão ignorados. Os filhos que tiveram alguma das propriedades filtradas alteradas após o preenchimento dos resultados iniciais podem não corresponder mais à consulta. Isso não é verificado.

Também é possível carregar dados seletivamente para cada filho, usando o mesmo objeto de opções disponível para `query.get(options)`.

Exemplo:

```typescript
// Consultar livros, transmitindo os resultados um de cada vez:
await db
    .query("books")
    .filter("category", "==", "cooking")
    .forEach((bookSnapshot) => {
        const livro = bookSnapshot.val();
        console.log(`Encontrado livro de culinária "${livro.title}": "${livro.description}"`);
    });

// Agora, carregue apenas as propriedades 'title' e 'description' do livro
await db
    .query("books")
    .filter("categoria", "==", "culinária")
    .forEach({ include: ["title", "description"] }, (bookSnapshot) => {
        const livro = bookSnapshot.val();
        console.log(`Encontrado livro de culinária "${livro.title}": "${livro.description}"`);
    });
```

Veja também [Iteração (streaming) de filhos](#iterando-filhos-foreach)

### `Query.on` - Consultas em tempo real

IvipBase agora suporta consultas em tempo real (ao vivo) e é capaz de enviar notificações quando há alterações nos resultados iniciais da consulta

```typescript
let fiveStarBooks = {}; // mapeia chaves para valores de livros
function gotMatches(snaps) {
    snaps.forEach((snapshot) => {
        fiveStarBooks[snapshot.key] = snapshot.val();
    });
}
function matchAdded(match) {
    // adicionar livro aos resultados
    fiveStarBooks[match.snapshot.key] = match.snapshot.val();
}
function matchChanged(match) {
    // atualizar detalhes do livro
    fiveStarBooks[match.snapshot.key] = match.snapshot.val();
}
function matchRemoved(match) {
    // remover livro dos resultados
    delete fiveStarBooks[match.ref.key];
}

db.query("livros")
    .filter("rating", "==", 5)
    .on("add", matchAdded)
    .on("change", matchChanged)
    .on("remove", matchRemoved)
    .get(gotMatches);
```

NOTA: O uso de `take` e `skip` atualmente não é levado em consideração. Eventos podem ser acionados para resultados que não estão no intervalo solicitado

## `reflect` - API de reflexão

O **iVipBase** possui uma API de reflexão integrada que permite navegar no conteúdo do banco de dados sem recuperar nenhum dado (aninhado). Esta API está disponível para bancos de dados locais e bancos de dados remotos quando conectado como usuário administrador ou em caminhos aos quais o usuário autenticado tem acesso.

A API `reflect` também é usada internamente: o `webmanager` do servidor **iVipBase** a utiliza para permitir a exploração do banco de dados, e a classe `DataReference` a utiliza para entregar resultados para `count()` e retornos de chamada de eventos `notify_child_added` iniciais.

### `info` - Obtenha informações sobre um nó

Para obter informações sobre um nó e seus filhos, use uma consulta `info`:

```typescript
// Obtenha informações sobre o nó raiz e um máximo de 200 filhos:
db.root.reflect('info', { child_limit: 200, child_skip: 0 })
.then(info => { /* ... */ });
```

O exemplo acima retornará um objeto info com a seguinte estrutura:

```typescript
{ 
    "key": "",
    "exists": true, 
    "type": "object",
    "children": { 
        "more": false, 
        "list": [
            { "key": "appName", "type": "string", "value": "My social app" },
            { "key": "appVersion", "type": "number", "value": 1 },
            { "key": "posts", "type": "object" }
        ] 
    } 
}
```

Para obter o número de filhos de um nó (em vez de enumerá-los), passe `{ child_count: true }` com a solicitação de reflexão de informações:

```typescript
const info = await db.ref('chats/somechat/messages')
    .reflect('info', { child_count: true });
```

Isso retornará um objeto info com a seguinte estrutura:

```typescript
{ 
    "key": "messages",
    "exists": true, 
    "type": "object",
    "children": { 
        "count": 879
    }
}
```

### `children` - Obtenha filhos de um nó

Para obter informações sobre os filhos de um nó, use a consulta de reflexão `children`:

```typescript
const children = await db.ref('chats/somechat/messages')
    .reflect('children', { limit: 10, skip: 0 });
```

O objeto `children` retornado no exemplo acima terá a seguinte estrutura:

```typescript
{
    "more": true,
    "list": {
        "message1": { "type": "object" },
        "message2": { "type": "object" },
        // ...
        "message10": { "type": "object" }
    }
}
```

# `getAuth` - API de autenticação

A API é semelhante à do Auth do Firebase. Para utilizá-la, será necessário empregar a função `getAuth`. Essa função é responsável por configurar a API de consumo com as predefinições no `initializeApp`. Requer um parâmetro, no qual você pode inserir a instância obtida por meio da função `initializeApp`, criando uma instância da classe `IvipBaseApp` ou uma string do nome da aplicação específica. Caso o parâmetro não seja fornecido, o `getAuth` considerará a primeira aplicação criada ou a aplicação padrão, se houver. Abaixo, seguem dois exemplos de uso do `getAuth`:

```typescript
import { initializeApp, getAuth } from "ivipbase";

const app = initializeApp({
    dbname: "mydb", // Cria ou abre um banco de dados com o nome "mydb"
    logLevel: "log",
    // ... outras opções
});

const auth = getAuth(app);
const user = auth.currentUser; // Obtém o usuário atualmente autenticado
```

Neste exemplo, o `getDatabase` considera a aplicação padrão ou a primeira aplicação criada com um nome definido.

```typescript
import { getAuth } from "ivipbase";

const auth = getAuth(app);
const user = auth.currentUser; // Obtém o usuário atualmente autenticado
```

## `ready` - Evento de inicialização

O evento `ready` é acionado quando a API de autenticação está pronta para uso. Abaixo, segue um exemplo de uso:

```typescript
auth.ready((user) => {
    console.log("API de autenticação pronta para uso");
});
```

## `createUserWithEmailAndPassword` - Criar usuário com e-mail e senha

Para criar um usuário com e-mail e senha, você pode usar a função `createUserWithEmailAndPassword`. Ela requer dois parâmetros: um e-mail e uma senha. Abaixo, segue um exemplo de uso:

```typescript
auth.createUserWithEmailAndPassword("user@example.com", "password")
    .then((user) => {
        console.log("Usuário criado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao criar usuário:", error);
    });
```

Essa função, após a criação do usuário com sucesso, como padrão, é feito o login do usuário. Caso você não queira que isso aconteça, você pode passar um terceiro parâmetro `false` para a função `createUserWithEmailAndPassword`:

```typescript
auth.createUserWithEmailAndPassword("user@example.com", "password", false)
    .then((user) => {
        console.log("Usuário criado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao criar usuário:", error);
    });
```

## `createUserWithUsernameAndPassword` - Criar usuário com nome de usuário e senha

Para criar um usuário com nome de usuário e senha, você pode usar a função `createUserWithUsernameAndPassword`. Ela requer dois parâmetros: um nome de usuário e uma senha. Abaixo, segue um exemplo de uso:

```typescript
auth.createUserWithUsernameAndPassword("user", "user@example.com", "password")
    .then((user) => {
        console.log("Usuário criado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao criar usuário:", error);
    });
```

Essa função, após a criação do usuário com sucesso, como padrão, é feito o login do usuário. Caso você não queira que isso aconteça, você pode passar um quarto parâmetro `false` para a função `createUserWithUsernameAndPassword`:

```typescript
auth.createUserWithUsernameAndPassword("user", "user@example.com", "password", false)
    .then((user) => {
        console.log("Usuário criado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao criar usuário:", error);
    });
```

## `signInWithEmailAndPassword` - Login com e-mail e senha

Para fazer login com e-mail e senha, você pode usar a função `signInWithEmailAndPassword`. Ela requer dois parâmetros: um e-mail e uma senha. Abaixo, segue um exemplo de uso:

```typescript
auth.signInWithEmailAndPassword("user@example.com", "password")
    .then((user) => {
        console.log("Usuário logado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao fazer login:", error);
    });
```

Você também pode adicionar um evento de retorno de chamada para ser acionado quando o usuário for autenticado:

```typescript
auth.on("signin", (user) => {
    console.log("Usuário logado com sucesso:", user);
});
```

## `signInWithUsernameAndPassword` - Login com nome de usuário e senha

Para fazer login com nome de usuário e senha, você pode usar a função `signInWithUsernameAndPassword`. Ela requer dois parâmetros: um nome de usuário e uma senha. Abaixo, segue um exemplo de uso:

```typescript
auth.signInWithUsernameAndPassword("user", "password")
    .then((user) => {
        console.log("Usuário logado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao fazer login:", error);
    });
```

Você também pode adicionar um evento de retorno de chamada para ser acionado quando o usuário for autenticado:

```typescript
auth.on("signin", (user) => {
    console.log("Usuário logado com sucesso:", user);
});
```

## `signInWithToken` - Login com token

Para fazer login com um token, você pode usar a função `signInWithToken`. Ela requer um parâmetro: um token. Abaixo, segue um exemplo de uso:

```typescript
auth.signInWithToken("token")
    .then((user) => {
        console.log("Usuário logado com sucesso:", user);
    })
    .catch((error) => {
        console.error("Erro ao fazer login:", error);
    });
```

Você também pode adicionar um evento de retorno de chamada para ser acionado quando o usuário for autenticado:

```typescript
auth.on("signin", (user) => {
    console.log("Usuário logado com sucesso:", user);
});
```

## `signOut` - Logout

Para fazer logout, você pode usar a função `signOut`. Abaixo, segue um exemplo de uso:

```typescript
auth.signOut()
    .then(() => {
        console.log("Usuário deslogado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
```

Você também pode adicionar um evento de retorno de chamada para ser acionado quando o usuário for deslogado:

```typescript
auth.on("signout", () => {
    console.log("Usuário deslogado com sucesso");
});
```

## `onAuthStateChanged` - Observar mudanças de autenticação

Para observar mudanças de autenticação, você pode usar a função `onAuthStateChanged`. Ela requer um parâmetro: uma função de retorno de chamada que será acionada quando houver mudanças de autenticação. Abaixo, segue um exemplo de uso:

```typescript
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Usuário logado:", user);
    } else {
        console.log("Usuário deslogado");
    }
});
```

## `onIdTokenChanged` - Observar mudanças de token

Para observar mudanças de token, você pode usar a função `onIdTokenChanged`. Ela requer um parâmetro: uma função de retorno de chamada que será acionada quando houver mudanças de token. Abaixo, segue um exemplo de uso:

```typescript
auth.onIdTokenChanged((token) => {
    console.log("Token alterado:", token);
});
```

## `updateCurrentUser` - Atualizar usuário atual

Para atualizar o usuário atual, você pode usar a função `updateCurrentUser`. Ela requer um parâmetro: um usuário. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
auth.updateCurrentUser(user)
    .then(() => {
        console.log("Usuário atualizado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao atualizar usuário:", error);
    });
```

## `sendPasswordResetEmail` - Enviar e-mail de redefinição de senha

Para enviar um e-mail de redefinição de senha, você pode usar a função `sendPasswordResetEmail`. Ela requer um parâmetro: um e-mail. Abaixo, segue um exemplo de uso:

```typescript
auth.sendPasswordResetEmail("user@example.com")
    .then(() => {
        console.log("E-mail de redefinição de senha enviado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao enviar e-mail de redefinição de senha:", error);
    });
```

## `applyActionCode` - Aplicar código de ação

Para aplicar um código de ação, você pode usar a função `applyActionCode`. Ela requer um parâmetro: um código de ação. Abaixo, segue um exemplo de uso:

```typescript
auth.applyActionCode("code")
    .then(() => {
        console.log("Código de ação aplicado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao aplicar código de ação:", error);
    });
```

## `checkActionCode` - Verificar código de ação

Para verificar um código de ação, você pode usar a função `checkActionCode`. Ela requer um parâmetro: um código de ação. Abaixo, segue um exemplo de uso:

```typescript
auth.checkActionCode("code")
    .then((info) => {
        console.log("Código de ação verificado com sucesso:", info);
    })
    .catch((error) => {
        console.error("Erro ao verificar código de ação:", error);
    });
```

## `confirmPasswordReset` - Confirmar redefinição de senha

Para confirmar a redefinição de senha, você pode usar a função `confirmPasswordReset`. Ela requer dois parâmetros: um código de ação e uma nova senha. Abaixo, segue um exemplo de uso:

```typescript
auth.confirmPasswordReset("code", "newPassword")
    .then(() => {
        console.log("Redefinição de senha confirmada com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao confirmar redefinição de senha:", error);
    });
```

## `verifyPasswordResetCode` - Verificar código de redefinição de senha

Para verificar um código de redefinição de senha, você pode usar a função `verifyPasswordResetCode`. Ela requer um parâmetro: um código de redefinição de senha. Abaixo, segue um exemplo de uso:

```typescript
auth.verifyPasswordResetCode("code")
    .then((email) => {
        console.log("Código de redefinição de senha verificado com sucesso:", email);
    })
    .catch((error) => {
        console.error("Erro ao verificar código de redefinição de senha:", error);
    });
```

## `User` - Informações do usuário autenticado

Para obter informações do usuário autenticado, você pode usar a propriedade `currentUser`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;

// ID do usuário
console.log(user.uid);

// Nome do usuário
console.log(user.username);

// E-mail do usuário
console.log(user.email);

// Nome do usuário
console.log(user.displayName);

// Foto do usuário
console.log(user.photoURL);

// E-mail verificado
console.log(user.emailVerified);

// Data de criação
console.log(user.created);

// Data do ultimo login
console.log(user.lastSignin);

// Endereço IP do ultimo login
console.log(user.lastSigninIp);

// Data do login anterior
console.log(user.previousSignin);

// Endereço IP do login anterior
console.log(user.previousSigninIp);

// Verificar se o usuário precisa alterar a senha
console.log(user.changePassword);

// Se `changePassword` for verdadeiro, data/hora em que a alteração da senha foi solicitada (string de data ISO)
console.log(user.changePasswordRequested);

// Se `changePassword` for verdadeiro, data/hora em que a senha deve ter sido alterada (string de data ISO)
console.log(user.changePasswordBefore);

// Configurações adicionais do usuário
console.log(user.settings);
```

### `User.accessToken` - Token de acesso

Para obter o token de acesso de um usuário, você pode usar a propriedade `accessToken`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
console.log("Token de acesso:", user.accessToken);
```

### `User.providerData` - Dados do provedor

Para obter os dados do provedor de um usuário, você pode usar a propriedade `providerData`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
console.log("Dados do provedor:", user.providerData);
```

### `User.updateProfile` - Atualizar perfil

Para atualizar o perfil de um usuário, você pode usar a função `updateProfile`. Ela requer um parâmetro: um objeto com as propriedades a serem atualizadas. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.updateProfile({
    displayName: "User",
    photoURL: "https://example.com/user.jpg"
})
    .then(() => {
        console.log("Perfil atualizado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao atualizar perfil:", error);
    });
```

### `User.updateEmail` - Atualizar e-mail

Para atualizar o e-mail de um usuário, você pode usar a função `updateEmail`. Ela requer um parâmetro: um e-mail. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.updateEmail("user123@example.com")
    .then(() => {
        console.log("E-mail atualizado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao atualizar e-mail:", error);
    });
```

### `User.updatePassword` - Atualizar senha

Para atualizar a senha de um usuário, você pode usar a função `updatePassword`. Ela requer um parâmetro: uma senha. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.updatePassword("currentPassword", "newPassword")
    .then(() => {
        console.log("Senha atualizada com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao atualizar senha:", error);
    });
```

### `User.updateUsername` - Atualizar nome de usuário

Para atualizar o nome de usuário de um usuário, você pode usar a função `updateUsername`. Ela requer um parâmetro: um nome de usuário. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.updateUsername("newUser")
    .then(() => {
        console.log("Nome de usuário atualizado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao atualizar nome de usuário:", error);
    });
```

### `User.sendEmailVerification` - Enviar verificação de e-mail

Para enviar uma verificação de e-mail para um usuário, você pode usar a função `sendEmailVerification`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.sendEmailVerification()
    .then(() => {
        console.log("Verificação de e-mail enviada com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao enviar verificação de e-mail:", error);
    });
```

### `User.delete` - Deletar usuário

Para deletar um usuário, você pode usar a função `delete`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.delete()
    .then(() => {
        console.log("Usuário deletado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao deletar usuário:", error);
    });
```

### `User.getIdToken` - Obter token de ID

Para obter o token de ID de um usuário, você pode usar a função `getIdToken`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.getIdToken()
    .then((token) => {
        console.log("Token de ID obtido com sucesso:", token);
    })
    .catch((error) => {
        console.error("Erro ao obter token de ID:", error);
    });
```

### `User.getIdTokenResult` - Obter resultado do token de ID

Para obter o resultado do token de ID de um usuário, você pode usar a função `getIdTokenResult`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.getIdTokenResult()
    .then((result) => {
        console.log("Resultado do token de ID obtido com sucesso:", result);
    })
    .catch((error) => {
        console.error("Erro ao obter resultado do token de ID:", error);
    });
```

### `User.reload` - Recarregar usuário

Para recarregar um usuário, você pode usar a função `reload`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
user.reload()
    .then(() => {
        console.log("Usuário recarregado com sucesso");
    })
    .catch((error) => {
        console.error("Erro ao recarregar usuário:", error);
    });
```

### `User.toJSON` - Converter para JSON

Para converter um usuário para JSON, você pode usar a função `toJSON`. Abaixo, segue um exemplo de uso:

```typescript
let user = auth.currentUser;
let json = user.toJSON();
```

### `User.fromJSON` - Converter de JSON

Para converter um usuário de JSON, você pode usar a função `fromJSON`. Abaixo, segue um exemplo de uso:

```typescript
let json = {
    uid: "uid",
    // ...
};

let user = auth.currentUser;
user.fromJSON(json);
```

# `getStorage` - API de armazenamento em nuvem

# `getFunctions` - API para funções de nuvem

# `getExtensions` - API para extensões de nuvem

# `CustomStorage` - Armazenamento personalizado

## Armazenamento `Map` (`DataStorageSettings`)

## Conexão ao MongoDB (`MongodbSettings`)

## Arquivo local JSON (`JsonFileStorageSettings`)