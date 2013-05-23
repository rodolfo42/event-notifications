## About this code

Provides a Node.js code for a server which receives and broadcasts notifications to its registered listeners, as well as the client-side code for receiving a notification from the server display a notification on the screen using the Desktop Notifications API. In concept, it uses the [Pub/Sub] [PubSub] model.

All the theory behind it is described in [this post] [blog].

The most important aspect to notice about this code is: in a scenario where the user can have several tabs in browser open in a page of a given app, *only one of those tabs will receive the notification* and display it to the user, **avoiding an excessive number of notifications for each open tab**, due to the fact that the client-side code for receiving and displaying such notifications will be present in every page of the app (or most of it).

### Technical details

Node.js was used due to its asynchronous nature and concise code when writing concurrent apps. That way, it's possible to have several *subscribers* and still keeping the same response latency for the application, because it's not necessary to wait until all clients have received the notification.

[Express] [ExpressJS] was used, a simple, Sinatra-style framework for building web apps and APIs in Node.js.

[Socket.io] [SocketIO] for comunication between client and server, which includes supports for WebSockets.


## Sobre este código

Provê um código Node.js para um servidor que recebe e publica notificações de eventos genéricos a sockets registrados, bem como o código cliente-side necessário para receber uma notificação do servidor e exibir na tela usando Desktop Notifications API. Em conceito, faz uso do modelo [Pub/Sub] [PubSub].

Todo o pensamento está melhor descrito [neste post] [blog].

O aspecto mais importante desta implementação é: em um cenário onde o usuário tem várias abas abertas em um navegador para uma determinada aplicação, *somente uma aba receberá o evento* e exibirá a notificação, **evitando um número excessivo de notificações para cada aba aberta**. As notificações seriam exibidas aos montes pois o código client-side estará idealmente presente em todas as páginas da aplicação (ou na maioria).

### Detalhes técnicos

Foi usado o node.js devido á sua natureza assíncrona e código conciso ao escrever aplicações paralelas. Desta maneira, foi possível ter vários *subscribers* porém nunca aumentando a latência de resposta quando a aplicação vai divulgar um evento, pois não é necessário esperar até que todos tenham recebido a notificação.

Foi usada a framework [Express] [ExpressJS], uma framework simples estilo Sinatra para criação de web apps e APIs usando Node.js.

Foi usado [Socket.io] [SocketIO] para comunicação cliente-servidor, que inclui suporte a WebSockets.

[PubSub]: http://c2.com/cgi/wiki?PublishSubscribeModel
[blog]: http://rodolfoferreira.com.br/2013/02/14/real-time-event-notifications-for-web-apps-part-1
[ExpressJS]: http://expressjs.com/
[SocketIO]: http://socket.io/
