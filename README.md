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
    - [Carregando dados](#carregando-dados)

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

## Contando crianças

Para descobrir rapidamente quantos filhos um nó específico possui, use o count método em um `DataReference`:

```Javascript
const messageCount = aguardar db .ref('chat/mensagens'< a i=9>).contagem()< ai=14>;
```

### Limitar o carregamento de dados aninhados
Se a estrutura do seu banco de dados estiver usando aninhamento (por exemplo, armazenando postagens em `'users/someuser/posts'` em vez de em `'posts'`), talvez você queira limitar a quantidade de dados que você estão recuperando na maioria dos casos. Por exemplo: se você deseja obter os detalhes de um usuário, mas não deseja carregar todos os dados aninhados, você pode limitar explicitamente a recuperação de dados aninhados passando `exclude`, include e/ou `child_objects` opções para `.get`:

```Javascript
// Excluir dados aninhados específicos:
db.ref('usuários/algumusuário')
. obter({ excluir:  ['postagens', 'comentários'< a i=17>]}).então< a i=22>(snap=>{// instantâneo contém todas as propriedades de 'someuser' exceto // 'users/someuser/posts' e 'users/someuser/comments'(obter.)'usuários/algumusuário /postagens'(ref.db// Inclui dados aninhados específicos:;)}incluir: ['*/ título','*/posted']}).então(snap=>{// instantâneo contém todas as postagens de 'someuser', mas cada postagem // contém apenas 'título' e 'publicado' propriedades});// Combine include & excluir:db.ref('usuários/algumusuário').obter ({excluir: [ 'comentários'],incluir: }< /span>encaixar< /span>// o instantâneo contém todos os dados do usuário sem a coleção de 'comentários', < /span>};)// e cada objeto na coleção 'posts' contém apenas uma propriedade 'title'.{=>(então.)]'posts/*/title'[ 
```

**OBSERVAÇÃO:** isso permite que você faça o que o Firebase não consegue: armazenar seus dados em locais lógicos e obter apenas os dados de seu interesse, rapidamente. Além disso, você ainda pode indexar seus dados aninhados e consultá-los com ainda mais rapidez. Consulte [Indexação de dados ](#Indexação) para obter mais informações.

**Iterando (streaming) filhos**
(NOVO desde v1.4.0)

Para iterar todos os filhos de uma coleção de objetos sem carregar todos os dados na memória de uma só vez, você pode usar `forEach` que transmite cada filho e executa uma função de retorno de chamada com um instantâneo de seus dados . Se a função de retorno de chamada retornar `false`, a iteração será interrompida. Se o retorno de chamada retornar um Promise, a iteração aguardará a resolução antes de carregar o próximo filho.

Os filhos a serem iterados são determinados no início da função. Como forEach não bloqueia a leitura/gravação da coleção, é possível que os dados sejam alterados durante a iteração. Os filhos adicionados durante a iteração serão ignorados, os filhos removidos serão ignorados.

Também é possível carregar dados seletivamente para cada filho, utilizando o mesmo objeto de opções disponível `pararef.get(options)`

Exemplos:

```Javascript
// Transmita todos os livros, um de cada vez (carrega todos os dados de cada livro):
await db.ref('livros') .forEach(bookSnapshot = > {
   const livro = bookSnapshot.val();
   console.registro(`Recebi o livro "${livro.título'descrição','título' [: incluir{( forEach.)'livros'(ref.dbawait// Agora faça o mesmo, mas carregue apenas 'título' e 'descrição' de cada livro:;)};)"`}descrição.livro${": "}},bookSnapshot=>bookSnapshot;.;< /span>;)})"`}descriçãolivro${": "}título.livro${`Recebi o livro " ;(log.console)(valor.=bookconst{
```


Consulte também <span style="color:red;">[Como transmitir resultados da consulta](#resultados-de-pesquisa)</span>

Afirmando tipos de dados em TypeScript
Se estiver usando TypeScript, você pode passar um parâmetro de tipo para a maioria dos métodos de recuperação de dados que declararão o tipo do valor retornado. Observe que você é responsável por garantir que o valor corresponda ao tipo declarado em tempo de execução.

Exemplos:














