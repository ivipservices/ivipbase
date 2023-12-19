# iVipBase realtime database

Um motor e servidor de banco de dados NoSQL rápido, de baixo consumo de memória, transacional, com suporte a índices e consultas para node.js e navegador, com notificações em tempo real para alterações de dados. Suporta o armazenamento de objetos JSON, arrays, números, strings, booleanos, datas, bigints e dados binários (ArrayBuffer).

Inspirado por (e amplamente compatível com) o banco de dados em tempo real do Firebase e IvipBase, com funcionalidades adicionais e menos fragmentação/duplicação de dados. Capaz de armazenar até 2^48 (281 trilhões) de nós de objeto em um arquivo de banco de dados binário que teoricamente pode crescer até um tamanho máximo de 8 petabytes.

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
  - Carregando e armazenando dados
    - [Carregando dados](#carregando-dados)
    - [Armazenando dados](#Armazenando)
    - [Atualizando dados](#Atualizando)
    - [Removendo dados](#Removendo)
    - [Gerando chaves exclusivas](#Gerando)
    - [Usando matrizes](#Usando)
    - [Contando crianças](#Contando)
    - [Limitar o carregamento de dados aninhados](#Limitar)
    - [Iterando (streaming) filhos](#Iterando)
    - [Afirmando tipos de dados em TypeScript](#Afirmando)

<a id="começando"></a> 
## Começando

O iVipBase está dividido em dois pacotes:
* **ivipbase**: mecanismo de banco de dados iVipBase local, ponto de extremidade do servidor para permitir conexões remotas. Inclui autenticação e autorização de usuário integradas, suporta o uso de provedores externos OAuth, como Facebook e Google ([github](https://github.com/ivipservices/ivipbase), [npm](https://www.npmjs.com/package/ivipbase))
* **ivipbase-core**: funcionalidades compartilhadas, dependência do pacote acima ([github](https://github.com/ivipservices/ivipbase-core), [npm](https://www.npmjs.com/package/ivipbase-core))

Por favor, relate qualquer erro ou comportamento inesperado que encontrar criando uma issue no Github.
<a id="pré-requisitos"></a>
### Pré-requisitos

O iVipBase é projetado para ser executado em um ambiente [Node.js](https://nodejs.org/), **também é possível usar bancos de dados iVipBase no navegador**! Para executar o iVipBase no navegador, basta incluir um arquivo de script e você estará pronto! Consulte [iVipBase no navegador](#experimente-o-ivipbase-no-seu-navegador) para mais informações e exemplos de código!

<a id="instalação"></a> 
### Instalação

Todos os repositórios do iVipBase estão disponíveis no npm. Você só precisa instalar um deles, dependendo de suas necessidades:

<a id="criar-um-banco-de-dados-local"></a> 
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
 <a id="experimente-o-ivipbase-no-seu-navegador"></a> 
### Experimente o iVipBase no seu navegador

Se você quiser experimentar o iVipBase em execução no Node.js, basta abri-lo no [RunKit](https://npm.runkit.com/acebase) e seguir os exemplos. Se você quiser experimentar a versão do iVipBase para o navegador, abra [google.com](google.com) em uma nova guia (o GitHub não permite que scripts entre sites sejam carregados) e execute o trecho de código abaixo para usá-lo imediatamente no console do seu navegador.

*Para experimentar o iVipBase no RunKit:*

```js
const { initializeApp, getDatabase } = require('ivipbase');

const app = initializeApp({dbname: "my_db"});

const db = getDatabase(app);
db.ready(async () => {
    await db.ref('test').set({ text: 'This is my first IvipBase test in RunKit' });

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
    await db.ref('test').set({ text: 'This is my first IvipBase test in the browser' });

    const snap = await db.ref('test/text').get();
    console.log(`value of "test/text": ` + snap.val());
});
```
 <a id="configurar-um-servidor-de-banco-de-dados"></a> 
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
 <a id="conectar-se-a-um-banco-de-dados-remoto"></a> 
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
 <a id="exemplo-de-uso"></a> 
## Exemplo de uso

A API é semelhante à do banco de dados em tempo real do Firebase e AceBase, com adições.
 <a id="criando-um-banco-de-dados"></a> 
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
 <a id="carregando-dados"></a> 
### Carregando dados

Execute `.get` em uma referência para obter o valor armazenado atualmente. É a abreviação da sintaxe do Firebase de `.once("value")`.

```javascript
const snapshot = await db.ref('game/config').get();
if (snapshot.exists()) {
    config = snapshot.val();
}
else {
    config = defaultGameConfig; // use defaults
}
 
```
Observação: ao carregar dados, o valor atualmente armazenado será agrupado e retornado em um objeto `DataSnapshot`. Use `snapshot.exists()` para determinar se o nó existe, `snapshot.val()` para obter o valor.

<a id="Armazenando"></a> 
### Armazenando dados

Definindo o valor de um nó, substituindo se existir:

```Javascript
const ref = await db.ref('game/config').set({
    name: 'Name of the game',
    max_players: 10
});
// stored at /game/config
```

Observação: ao armazenar dados, não importa se o caminho de destino e/ou os caminhos pai já existem. Se você armazenar dados em 'chats/somechatid/messages/msgid/receipts', qualquer nó inexistente será criado nesse caminho.

<a id="Atualizando"></a> 
### Atualizando dados

A atualização do valor de um nó mescla o valor armazenado com o novo objeto. Se o nó de destino não existir, ele será criado com o valor passado.

```javascript
const ref = await db.ref('game/config').update({
    description: 'The coolest game in the history of mankind'
});

// config was updated, now get the value (ref points to 'game/config')
const snapshot = await ref.get();
const config = snapshot.val();

// `config` now has properties "name", "max_players" and "description"
```
<a id="Removendo"></a> 
### Removendo dados

Você pode `remover` dados com o remove método

```Javascript
db.ref('animals/dog')
.remove()
.then(() => { /* removed successfully */ )};
```


A remoção de dados também pode ser feita definindo ou atualizando seu valor para `null`. Qualquer propriedade que tenha um valor nulo será removida do nó do objeto pai.

```Javascript
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
### Gerando chaves exclusivas

Para todos os dados genéricos adicionados, você precisa criar chaves que sejam exclusivas e que não entrem em conflito com chaves geradas por outros clientes. Para fazer isso, você pode gerar chaves exclusivas com `push`. Nos bastidores, push usa [cuid](https://www.npmjs.com/package/cuid) para gerar chaves que são garantidamente exclusivas e classificáveis ​​no tempo.

```Javascript
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

```Javascript
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

```Javascript
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
<a id="Usando"></a> 
### Usando matrizes

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

```Javascript
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

```Javascript
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

<a id="Contando"></a> 
## Contando crianças

Para descobrir rapidamente quantos filhos um nó específico possui, use o count método em um `DataReference`:

```Javascript
const messageCount = aguardar db .ref('chat/mensagens'< a i=9>).contagem()< ai=14>;
```

<a id="Limitar"></a> 
### Limitar o carregamento de dados aninhados
Se a estrutura do seu banco de dados estiver usando aninhamento (por exemplo, armazenando postagens em `'users/someuser/posts'` em vez de em `'posts'`), talvez você queira limitar a quantidade de dados que você estão recuperando na maioria dos casos. Por exemplo: se você deseja obter os detalhes de um usuário, mas não deseja carregar todos os dados aninhados, você pode limitar explicitamente a recuperação de dados aninhados passando `exclude`, include e/ou `child_objects` opções para `.get`:

```Javascript
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

**OBSERVAÇÃO:** isso permite que você faça o que o Firebase não consegue: armazenar seus dados em locais lógicos e obter apenas os dados de seu interesse, rapidamente. Além disso, você ainda pode indexar seus dados aninhados e consultá-los com ainda mais rapidez. Consulte [Indexação de dados ](#Indexação) para obter mais informações.

<a id="Iterando"></a> 
**Iterando (streaming) filhos**
(NOVO desde v1.4.0)

Para iterar todos os filhos de uma coleção de objetos sem carregar todos os dados na memória de uma só vez, você pode usar `forEach` que transmite cada filho e executa uma função de retorno de chamada com um instantâneo de seus dados . Se a função de retorno de chamada retornar `false`, a iteração será interrompida. Se o retorno de chamada retornar um Promise, a iteração aguardará a resolução antes de carregar o próximo filho.

Os filhos a serem iterados são determinados no início da função. Como forEach não bloqueia a leitura/gravação da coleção, é possível que os dados sejam alterados durante a iteração. Os filhos adicionados durante a iteração serão ignorados, os filhos removidos serão ignorados.

Também é possível carregar dados seletivamente para cada filho, utilizando o mesmo objeto de opções disponível `pararef.get(options)`

Exemplos:

```Javascript
// Stream all books one at a time (loads all data for each book):
await db.ref('books').forEach(bookSnapshot => {
   const book = bookSnapshot.val();
   console.log(`Got book "${book.title}": "${book.description}"`);
});

// Now do the same but only load 'title' and 'description' of each book:
await db.ref('books').forEach(
   { include: ['title', 'description'] }, 
   bookSnapshot => {
      const book = bookSnapshot.val();
      console.log(`Got book "${book.title}": "${book.description}"`);
   }
);
```


Consulte também [Como transmitir resultados da consulta](#resultados-de-pesquisa)
<a id="Afirmando"></a> 
### Afirmando tipos de dados em TypeScript
Se estiver usando TypeScript, você pode passar um parâmetro de tipo para a maioria dos métodos de recuperação de dados que declararão o tipo do valor retornado. Observe que você é responsável por garantir que o valor corresponda ao tipo declarado em tempo de execução.

Exemplos:

```javascript
const snapshot = await db.ref<MyClass>('users/someuser/posts').get<MyClass>();
//                            ^ type parameter can go here,        ^ here,
if (snapshot.exists()) {
    config = snapshot.val<MyClass>();
    //                    ^ or here
}

// A type parameter can also be used to assert the type of a callback parameter
await db.ref('users/someuser/posts')
    .transaction<MyClass>(snapshot => {
        const posts = snapshot.val(); // posts is of type MyClass
        return posts;
    })

// Or when iterating over children
await db.ref('users').forEach<UserClass>(userSnapshot => {
    const user = snapshot.val(); // user is of type UserClass
})
```


### Monitorando alterações de dados em tempo real
Você pode assinar eventos de dados para receber notificações em tempo real à medida que o nó monitorado é alterado. Quando conectado a um servidor AceBase remoto, os eventos serão enviados aos clientes por meio de uma conexão websocket. Os eventos suportados são:

- `'value'`: acionado quando o valor de um nó muda (incluindo alterações em qualquer valor filho)
- `'child_added'`: acionado quando um nó filho é adicionado, o retorno de chamada contém um instantâneo do nó filho adicionado
- `'child_changed'`: acionado quando o valor de um nó filho é alterado, o retorno de chamada contém um instantâneo do nó filho alterado
- `'child_removed'`: acionado quando um nó filho é removido, o retorno de chamada contém um instantâneo do nó filho removido
- `'mutated'`: (NOVO v0.9.51) acionado quando qualquer propriedade aninhada de um nó é alterada, o retorno de chamada contém um instantâneo e uma referência da mutação exata.
- `'mutations'`: (NOVA v0.9.60) como 'mutated', mas dispara com uma matriz de todas as mutações causadas por uma única atualização do banco de dados.
- `'notify_*'`: versão apenas para notificação dos eventos acima sem dados, consulte "Notificar apenas eventos" abaixo

``` Javascript
// Using event callback
db.ref('users')
.on('child_added', userSnapshot => {
    // fires for all current children, 
    // and for each new user from then on
});

```


``` Javascript
// To be able to unsubscribe later:
function userAdded(userSnapshot) { /* ... */ }
db.ref('users').on('child_added', userAdded);
// Unsubscribe later with .off:
db.ref('users').off('child_added', userAdded);

```
AceBase usa as mesmas assinaturas de método `.on` e `.off` do Firebase, mas também oferece outra maneira de assinar os eventos usando o retornado. `EventStream` você pode `subscribe`. Ter uma assinatura ajuda a cancelar mais facilmente a inscrição nos eventos posteriormente. Além disso, subscribe os retornos de chamada são acionados apenas para eventos futuros por padrão, ao contrário do .on retorno de chamada, que também é acionado para valores atuais de eventos `'value'` e `'child_added'`:

``` Javascript
// Using .subscribe
const addSubscription = db.ref('users')
.on('child_added')
.subscribe(newUserSnapshot => {
    // .subscribe only fires for new children from now on
});

const removeSubscription = db.ref('users')
.on('child_removed')
.subscribe(removedChildSnapshot => {
    // removedChildSnapshot contains the removed data
    // NOTE: snapshot.exists() will return false, 
    // and snapshot.val() contains the removed child value
});

const changesSubscription = db.ref('users')
.on('child_changed')
.subscribe(updatedUserSnapshot => {
    // Got new value for an updated user object
});

// Stopping all subscriptions later:
addSubscription.stop();
removeSubscription.stop();
changesSubscription.stop();

```
Se você quiser usar `.subscribe` enquanto também obtém retornos de chamada de dados existentes, passe `true` como argumento de retorno de chamada:

``` Javascript

db.ref('users/some_user')
.on('value', true) // passing true triggers .subscribe callback for current value as well
.subscribe(userSnapshot => {
    // Got current value (1st call), or new value (2nd+ call) for some_user
});
```
O `EventStream` retornado por `.on` também pode ser usado para `subscribe` mais de uma vez:
``` Javascript
const newPostStream = db.ref('posts').on('child_added');
const subscription1 = newPostStream.subscribe(childSnapshot => { /* do something */ });
const subscription2 = newPostStream.subscribe(childSnapshot => { /* do something else */ });
// To stop 1's subscription:
subscription1.stop(); 
// or, to stop all active subscriptions:
newPostStream.stop();

```
Se estiver usando TypeScript, você pode passar um parâmetro de tipo para `.on` ou para `.subscribe` para declarar o tipo do valor armazenado no instantâneo. Este tipo não é verificado pelo TypeScript; é sua responsabilidade garantir que o valor armazenado corresponda à sua afirmação.

``` Javascript
const newPostStream = db.ref('posts').on<MyClass>('child_added');
const subscription1 = newPostStream.subscribe(childSnapshot => {
    const child = childSnapshot.val(); // child is of type MyClass
 });
const subscription2 = newPostStream.subscribe<MyOtherClass>(childSnapshot => { 
    const child = childSnapshot.val(); // child is of type MyOtherClass
    // .subscribe overrode .on's type parameter
 });

### Using variables and wildcards in subscription paths

It is also possible to subscribe to events using wildcards and variables in the path:
```javascript
// Using wildcards:
db.ref('users/*/posts')
.on('child_added')
.subscribe(snap => {
    // This will fire for every post added by any user,
    // so for our example .push this will be the result:
    // snap.ref.vars === { 0: "ewout" }
    const vars = snap.ref.vars;
    console.log(`New post added by user "${vars[0]}"`)
});
db.ref('users/ewout/posts').push({ title: 'new post' });

// Using named variables:
db.ref('users/$userid/posts/$postid/title')
.on('value')
.subscribe(snap => {
    // This will fire for every new or changed post title,
    // so for our example .push below this will be the result:
    // snap.ref.vars === { 0: "ewout", 1: "jpx0k53u0002ecr7s354c51l", userid: "ewout", postid: (...), $userid: (...), $postid: (...) }
    // The user id will be in vars[0], vars.userid and vars.$userid
    const title = snap.val();
    const vars = snap.ref.vars; // contains the variable values in path
    console.log(`The title of post ${vars.postid} by user ${vars.userid} was set to: "${title}"`);
});
db.ref('users/ewout/posts').push({ title: 'new post' });

// Or a combination:
db.ref('users/*/posts/$postid/title')
.on('value')
.subscribe(snap => {
    // snap.ref.vars === { 0: 'ewout', 1: "jpx0k53u0002ecr7s354c51l", postid: "jpx0k53u0002ecr7s354c51l", $postid: (...) }
});
db.ref('users/ewout/posts').push({ title: 'new post' });
```
### Notificar apenas eventos
Além dos eventos mencionados acima, você também pode assinar seus `notify_` equivalentes que fazem o mesmo, mas com uma referência aos dados alterados em vez de um instantâneo. Isto é bastante útil se você deseja monitorar alterações, mas não está interessado nos valores reais. Isso também economiza recursos do servidor e resulta na transferência de menos dados do servidor. Ex: `notify_child_changed` executará seu retorno de chamada com uma referência ao nó alterado:

``` Javascript
ref.on('notify_child_changed', childRef => {
    console.log(`child "${childRef.key}" changed`);
})

```
### Aguarde a ativação dos eventos
Em algumas situações, é útil aguardar que os manipuladores de eventos estejam ativos antes de modificar os dados. Por exemplo, se quiser que um evento seja acionado para alterações que você está prestes a fazer, você deve certificar-se de que a assinatura está ativa antes de realizar as atualizações.

``` Javascript
var subscription = db.ref('users')
.on('child_added')
.subscribe(snap => { /*...*/ });

// Use activated promise
subscription.activated()
.then(() => {
    // We now know for sure the subscription is active,
    // adding a new user will trigger the .subscribe callback
    db.ref('users').push({ name: 'Ewout' });
})
.catch(err => {
    // Access to path denied by server?
    console.error(`Subscription canceled: ${err.message}`);
});

```
Se você quiser lidar com alterações no estado da assinatura depois que ela foi ativada (por exemplo, porque os direitos de acesso do lado do servidor foram alterados), forneça uma função de retorno de chamada para a chamada `activated`:

``` Javascript
subscription.activated((activated, cancelReason) => {
    if (!activated) {
        // Access to path denied by server?
        console.error(`Subscription canceled: ${cancelReason}`);
    }
});

```
### Obtenha o contexto desencadeador dos eventos
(NOVO v0.9.51)

Em alguns casos, é benéfico saber o que (e/ou quem) acionou o disparo de um evento de dados, para que você possa escolher o que deseja fazer com as atualizações de dados. Agora é possível passar informações de contexto com todos os `update`, `set`, `remove` e `transaction` operações, que serão repassadas para qualquer evento acionado nos caminhos afetados (em qualquer cliente conectado!)

Imagine a seguinte situação: você tem um editor de documentos que permite que várias pessoas editem ao mesmo tempo. Ao carregar um documento você atualiza sua `last_accessed` propriedade:
``` Javascript
// Load document & subscribe to changes
db.ref('users/ewout/documents/some_id').on('value', snap => {
    // Document loaded, or changed. Display its contents
    const document = snap.val();
    displayDocument(document);
});

// Set last_accessed to current time
db.ref('users/ewout/documents/some_id').update({ last_accessed: new Date() })

```
Isso acionará o evento `value` DUAS VEZES e fará com que o documento seja renderizado DUAS VEZES. Além disso, se qualquer outro usuário abrir o mesmo documento, ele será acionado novamente, mesmo que não seja necessário redesenhar!

Para evitar isso, você pode passar informações contextuais com a atualização:
``` Javascript
// Load document & subscribe to changes (context aware!)
db.ref('users/ewout/documents/some_id')
    .on('value', snap => {
        // Document loaded, or changed.
        const context = snap.context();
        if (context.redraw === false) {
            // No need to redraw!
            return;
        }
        // Display its contents
        const document = snap.val();
        displayDocument(document);
    });

// Set last_accessed to current time, with context
db.ref('users/ewout/documents/some_id')
    .context({ redraw: false }) // prevent redraws!
    .update({ last_accessed: new Date() })

```
### Rastreamento de alterações usando "mutado" e "mutações" eventos
(NOVO v0.9.51)

Esses eventos são usados ​​principalmente pelo AceBase nos bastidores para atualizar automaticamente os valores na memória com mutações remotas. Consulte [Observar alterações de valor em tempo real](#observar) e [Sincronização em tempo real com um proxy de dados ativo](#sincronizacao). É possível usar esses eventos sozinho, mas eles exigem alguns detalhes adicionais e provavelmente será melhor usar os métodos mencionados acima.

Dito isto, veja como usá-los:

Se você deseja monitorar o valor de um nó específico, mas não deseja obter todo o seu novo valor toda vez que uma pequena mutação é feita nele, assine a opção "mutada". evento. Este evento só é acionado quando os dados de destino estão realmente sendo alterados. Isso permite que você mantenha uma cópia em cache de seus dados na memória (ou banco de dados de cache) e replique todas as alterações feitas nele:


```Javascript
const chatRef = db.ref('chats/chat_id');
// Get current value
const chat = (await chatRef.get()).val();

// Subscribe to mutated event
chatRef.on('mutated', snap => {
    const mutatedPath = snap.ref.path; // 'chats/chat_id/messages/message_id'
    const propertyTrail = 
        // ['messages', 'message_id']
        mutatedPath.slice(chatRef.path.length + 1).split('/');

    // Navigate to the in-memory chat property target:
    let targetObject = propertyTrail.slice(0,-1).reduce((target, prop) => target[prop], chat);
    // targetObject === chat.messages
    const targetProperty = propertyTrail.slice(-1)[0]; // The last item in array
    // targetProperty === 'message_id'

    // Update the value of our in-memory chat:
    const newValue = snap.val(); // { sender: 'Ewout', text: '...' }
    if (newValue === null) {
        // Remove it
        delete targetObject[targetProperty]; // delete chat.messages.message_id
    }
    else {
        // Set or update it
        targetObject[targetProperty] = newValue; // chat.messages.message_id = newValue
    }
});

// Add a new message to trigger above event handler
chatRef.child('messages').push({
    sender: 'Ewout'
    text: 'Sending you a message'
})
```
NOTA: se você estiver conectado a um servidor AceBase remoto e a conexão for perdida, é importante que você sempre obtenha o valor mais recente ao reconectar, pois você pode ter perdido eventos de mutação.

O evento `'mutations'` faz o mesmo que `'mutated'`, mas será acionado no caminho da assinatura com uma matriz de todas as mutações causadas por uma única atualização do banco de dados . A melhor maneira de lidar com essas mutações é iterá-las usando `snapshot.forEach`:
```Javascript
chatRef.on('mutations', snap => {
    snap.forEach(mutationSnap => {
        handleMutation(mutationSnap);
    });
})
```
### Observe alterações de valor em tempo real

Agora você pode observar o valor em tempo real de um caminho e (por exemplo) vinculá-lo à sua UI. `ref.observe()` retorna um Observable RxJS que pode ser usado para observar atualizações neste nó e seus filhos. Ele não retorna instantâneos, então você pode vincular o observável diretamente à sua UI. O valor observado é atualizado internamente usando a opção "mutações" evento do banco de dados. Todas as mutações do banco de dados são aplicadas automaticamente ao valor na memória e acionam o observável para emitir o novo valor.
```Javascript
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
```Javascript
// In your Angular component:
ngOnInit() {
   this.liveChat = this.db.ref('chats/chat_id').observe();
}
```
Ou, se você quiser monitorar as atualizações por conta própria, faça a inscrição e o cancelamento:
```Javascript
ngOnInit() {
   this.observer = this.db.ref('chats/chat_id').observe().subscribe(chat => {
      this.chat = chat;
   });
}
ngOnDestroy() {
   // DON'T forget to unsubscribe!
   this.observer.unsubscribe();
}
```
NOTA: os objetos retornados no observável são atualizados apenas no downstream - quaisquer alterações feitas localmente não serão atualizadas no banco de dados. Se é isso que você gostaria de fazer... continue lendo! (Alerta de spoiler - use `proxy()`!)

### Usando métodos proxy em Typescript

No TypeScript é necessária alguma conversão de tipo adicional para acessar os métodos de proxy mostrados acima. Você pode usar a função `proxyAccess` para obter ajuda com isso. Esta função faz typecast e também verifica se o valor passado é de fato um proxy.

```Javascript
type ChatMessage = { from: string, text: string, sent: Date, received: Date, read: Date };
type MessageCollection = ObjectCollection<ChatMessage>;

// Easy & safe typecasting:
proxyAccess<MessageCollection>(chat.messages)
    .getObservable()
    .subscribe(messages => {
        // No need to define type of messages, TS knows it is a MessageCollection
    });

// Instead of:
(chat.messages as any as ILiveDataProxyValue<MessageCollection>)
    .getObservable()
    .subscribe(messages => {
        // messages: MessageCollection
    });

// Or, with unsafe typecasting (discouraged!)
(chat.messages as any)
    .getObservable()
    .subscribe((messages: MessageCollection) => {
        // messages: MessageCollection, but only because we've prevented typescript
        // from checking if the taken route to get here was ok.
        // If getObservable or subscribe method signatures change in the 
        // future, code will break without typescript knowing it!
    });
```
Com Angular, `getObservable` é útil para vinculação e atualização de UI:
```Javascript
@Component({
  selector: 'chat-messages',
  template: `<ng-container *ngIf="liveChat | async as chat">
    <h1>{{ chat.title }}</h1>
    <Message *ngFor="let item of chat.messages | keyvalue" [message]="item.value" />
    </ng-container>`
})
export class ChatComponent {
    liveChat: Observable<{ 
        title: string, 
        messages: ObjectCollection<{ from: string, text: string }> 
    }>;

    constructor(private dataProvider: MyDataProvider) {}

    async ngOnInit() {
        const proxy = await this.dataProvider.db.ref('chats/chat1').proxy();
        this.liveChat = proxyAccess(proxy.value).getObservable();
    }
}
```
Para completar o exemplo acima, `MyDataProvider` ficaria assim:
```Javascript
import { AceBase } from 'acebase';
@Injectable({
    providedIn: 'root'
})
export class MyDataProvider {
    db: AceBase;
    constructor() {
        this.db = new AceBase('chats');
    }
}
```
Vou deixar para sua imaginação como seria o `MessageComponent`.

## Consultando dados
Ao executar uma consulta, todos os nós filhos do caminho referenciado serão comparados com os critérios definidos e retornados em qualquer ordem `sort` solicitada. A paginação de resultados também é suportada, portanto você pode `skip` e `take` qualquer número de resultados. As consultas não exigem que os dados sejam indexados, embora isso seja recomendado se os dados ficarem maiores.

Para filtrar resultados, diversas instruções `filter(key, operator, compare)` podem ser adicionadas. Os resultados filtrados devem corresponder a todas as condições definidas (E lógico). Os operadores de consulta suportados são:

- '<': o valor deve ser menor quecompare
- '<=': o valor deve ser menor ou igual acompare
- '==': o valor deve ser igual acompare
- '!=': o valor não deve ser igual acompare
- '>': o valor deve ser maior quecompare
- '>=': o valor deve ser maior ou igual acompare
- 'exists': key deve existir
- '!exists': key não deve existir
- 'between': o valor deve estar entre os 2 valores no compare array (compare[0] <= valor <= compare[1] ). Se compare[0] > compare[1], seus valores serão trocados
- '!between': o valor não deve estar entre os 2 valores em compare array (valor < compare[0] ou valor > compare[1]). Se compare[0] > compare[1], seus valores serão trocados
- 'like': o valor deve ser uma string e deve corresponder ao padrão fornecido compare. Os padrões não diferenciam maiúsculas de minúsculas e podem conter curingas * para 0 ou mais caracteres e ?"Th?"< a i=5> para 1 caractere. (padrão corresponde a "The", não "That"; padrão "Th*" corresponde a "the" e "That")
- '!like': o valor deve ser uma string e não deve corresponder ao padrão fornecidocompare
- 'matches': o valor deve ser uma string e deve corresponder à expressão regularcompare
- '!matches': o valor deve ser uma string e não deve corresponder à expressão regularcompare
- 'in': o valor deve ser igual a um dos valores em compare array
- '!in': o valor não deve ser igual a nenhum valor na compare matriz
- 'has': o valor deve ser um objeto e deve ter propriedade compare.
- '!has': o valor deve ser um objeto e não deve ter propriedadecompare
- 'contains': o valor deve ser um array e deve conter um valor igual a compare ou conter todos os valores em compare array
- '!contains': o valor deve ser um array e não deve conter um valor igual a compare, ou não conter nenhum dos valores em compare array
- 
NOTA: uma consulta não requer nenhum `filter` critério. Você também pode usar um `query` para paginar seus dados usando `skip`, `take` e `sort`. Se você não especificar nenhum deles, o AceBase usará `.take`(100) como padrão. Se você não especificar um `sort`, a ordem dos valores retornados poderá variar entre as execuções.

```Javascript
db.query('songs')
.filter('year', 'between', [1975, 2000])
.filter('title', 'matches', /love/i)  // Songs with love in the title
.take(50)                   // limit to 50 results
.skip(100)                  // skip first 100 results
.sort('rating', false)      // highest rating first
.sort('title')              // order by title ascending
.get(snapshots => {
    // ...
});
```
Para converter rapidamente um array de snapshots nos valores que ele encapsula, você pode chamar `snapshots.getValues().` Este é um método conveniente e útil se você não estiver interessado nos resultados. caminhos ou chaves. Você também pode fazer isso sozinho com `var values = snapshots.map(snap => snap.val()):`
```Javascript
db.query('songs')
.filter('year', '>=', 2018)
.get(snapshots => {
    const songs = snapshots.getValues();
});
```
Em vez de usar o retorno de chamada de `.get`, você também pode usar o retornado `Promise`, que é muito útil em cadeias de promessas:
```Javascript
// ... in some promise chain
.then(fromYear => {
    return db.query('songs')
    .filter('year', '>=', fromYear)
    .get();
})
.then(snapshots => {
    // Got snapshots from returned promise
})
```
Isso também permite usar ES6 `async / await:`

```javascript
const snapshots = await db.query('songs')
    .filter('year', '>=', fromYear)
    .get();
```
### Limitando dados de resultados de consulta
Por padrão, as consultas retornarão instantâneos dos nós correspondentes, mas você também pode obter referências apenas passando a opção `{ snapshots: false }` ou usando a nova `.find()` método.

```javascript
// ...
const references = await db.query('songs')
    .filter('genre', 'contains', 'rock')
    .get({ snapshots: false });

// now we have references only, so we can decide what data to load
```
Usar o novo método `find()` faz o mesmo (v1.10.0+):

```javascript
const references = await db.query('songs')
    .filter('genre', 'contains', 'blues')
    .find();
```
Se quiser que os resultados da sua consulta incluam alguns dados (mas não todos), você pode usar as opções `include` e `exclude` para filtrar os campos nos resultados da consulta retornados por `get`:

```javascript
const snapshots = await db.query('songs')
    .filter('title', 'like', 'Love*')
    .get({ include: ['title', 'artist'] });
```
Os instantâneos no exemplo acima conterão apenas o título e de cada música correspondente campos artista. Consulte [Limitar carregamento de dados aninhados](#limitar) para obter mais informações sobre filtros `include e exclude`.

### Removendo dados com uma consulta
Para remover todos os nós que correspondem a uma consulta, basta chamar `remove` em vez de `get`:

```javascript

db.query('songs')
    .filter('year', '<', 1950)
    .remove(() => {
        // Old junk gone
    }); 

// Or, with await
await db.query('songs')
    .filter('year', '<', 1950)
    .remove();
```

### Contando resultados da consulta

Para obter uma contagem rápida dos resultados da consulta, você pode usar `.count()`:
```javascript
const count = await db.query('songs')
    .filter('artist', '==', 'John Mayer')
    .count();
```
Você pode usar isso em combinação com `skip` e `limit` para verificar se há resultados além do conjunto de dados atualmente carregado:

```javascript
const nextPageSongsCount = await db.query('songs')
    .filter('artist', '==', 'John Mayer')
    .skip(100)
    .take(10)
    .count(); // 10: full page, <10: last page.
```
NOTA: Este método atualmente realiza uma contagem nos resultados retornados por `.find()` nos bastidores, isso será otimizado em uma versão futura.

### Verificando a existência do resultado da consulta

Para determinar rapidamente se uma consulta tem alguma correspondência, você pode usar `.exists():`

```javascript
const exists = await db.query('users')
    .filter('email', '==', 'me@appy.one')
    .exists();
```
Assim como count(), você também pode combinar isso com skip e limit.

NOTA: Este método atualmente realiza uma verificação no resultado retornado por .count() nos bastidores, isso será otimizado em uma versão futura.

### Resultados da consulta de streaming

Para iterar pelos resultados de uma consulta sem carregar todos os dados na memória de uma só vez, você pode usar `forEach` que transmite cada filho e executa uma função de retorno de chamada com um instantâneo de seus dados. Se a função de retorno de chamada retornar `false`, a iteração será interrompida. Se o retorno de chamada retornar um `Promise`, a iteração aguardará a resolução antes de carregar o próximo filho.

A consulta será executada no início da função, recuperando referências a todos os filhos correspondentes (não aos seus valores). Depois disso, `forEach` carregará seus valores um de cada vez. É possível que os dados subjacentes sejam alterados durante a iteração. Os filhos correspondentes que foram removidos durante a iteração serão ignorados. Os filhos que tiveram alguma das propriedades filtradas alteradas após o preenchimento dos resultados iniciais podem não corresponder mais à consulta. Isso não é verificado.

Também é possível carregar dados seletivamente para cada filho, usando o mesmo objeto de opções disponível para `query.get(options)`.

Exemplo:

```javascript
// Query books, streaming the results one at a time:
await db.query('books')
 .filter('category', '==', 'cooking')
 .forEach(bookSnapshot => {
    const book = bookSnapshot.val();
    console.log(`Found cooking book "${book.title}": "${book.description}"`);
 });

// Now only load book properties 'title' and 'description'
await db.query('books')
 .filter('category', '==', 'cooking')
 .forEach(
   { include: ['title', 'description'] },
   bookSnapshot => {
      const book = bookSnapshot.val();
      console.log(`Found cooking book "${book.title}": "${book.description}"`);
   }
);
```

Veja também [Iteração (streaming) de filhos](#iteracao)

### Consultas em tempo real

IvipBase agora suporta consultas em tempo real (ao vivo) e é capaz de enviar notificações quando há alterações nos resultados iniciais da consulta

```javascript
let fiveStarBooks = {}; // maps keys to book values
function gotMatches(snaps) {
    snaps.forEach(snap => {
        fiveStarBooks[snap.key] = snap.val();
    });
}
function matchAdded(match) {
    // add book to results
    fiveStarBooks[match.snapshot.key] = match.snapshot.val();
}
function matchChanged(match) {
    // update book details
    fiveStarBooks[match.snapshot.key] = match.snapshot.val();
}
function matchRemoved(match) {
    // remove book from results
    delete fiveStarBooks[match.ref.key];
}

db.query('books')
    .filter('rating', '==', 5)
    .on('add', matchAdded)
    .on('change', matchChanged)
    .on('remove', matchRemoved)
    .get(gotMatches)
```
NOTA: O uso de `take` e `skip` atualmente não é levado em consideração. Eventos podem ser acionados para resultados que não estão no intervalo solicitado

