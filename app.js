var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    fs = require("fs"),
    http = require('http'),
    log4js = require('log4js'),
    listenPort = null;

// gets the port no from the command line
// ex: "node app 80"
if(typeof process.argv[2] != 'undefined') {
    listenPort = process.argv[2];
// tries to get AppFog port
} else if(process.env.VCAP_APP_PORT) {
    listenPort = process.env.VCAP_APP_PORT;
// default port
} else {
    listenPort = 3000;
}

var app = express();

var server = http.createServer(app);
var io = require('socket.io').listen(server, {log: false});

app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    app.use(express.static(__dirname + '/public'));
});

log4js.configure({
    appenders: [
        {type: "console"}
    ],
    replaceConsole: true
});

var log = log4js.getLogger();

/**
 * data structure to hold sockets grouped in slots, keyed by hashes which are
 * the session ids from the app.
 * 
 * Each slot represents a unique browser/workstation, and each socket inside the slots represents each open tab.
 * The sockets are stored and accessed in a LIFO-style structure (stack)
 *
 * When a socket is registered, it is added to the corresponding slot indicated by the hash - supplied by the API call
*/
var SocketMap = (function() {
    var Map = function() {
        return this;
    };

    /**
     * object used to store the slots
     * the keys are hashes, and values are arrays (accessed as stacks)
     * 
     * @type {Object}
     */
    Map.prototype.sockets = {};

    /**
     * adds a socket in the slot indicated by hash
     * if the slot doesn't exists, create it
     *
     * @param hash unique cookie in each browser/workstation
     * @param item {Socket}
     * @return {Map}
     */
    Map.prototype.add = function(hash, item) {
        // if the slot exists, add item to it
        if(typeof this.sockets[hash] != 'undefined') {
            var slot = this.sockets[hash];
            if(slot.indexOf(item) == -1) { // prevent duplicate items
                slot.push(item);
            }
        } else { // if there isnt a slot, creates it and registers item
            this.sockets[hash] = [item];
        }
        return this;
    };

    /**
     * removes an item (by reference to the same Socket object)
     *
     * @param item {Socket}
     * @return {Map}
     */
    Map.prototype.remove = function(item) {
        var index = 0;
        for(var hash in this.sockets) {
            var socks = this.sockets[hash];
            var idx = socks.indexOf(item);
            if(idx != -1) { // removes only if it exists
                socks.splice(idx, 1);
            }
            index++;
        }
        return this;
    };

    /**
     * returns only the top socket which is registered in the slot indicated by hash
     *
     * @param hash
     * @return {Socket}
     */
    Map.prototype.get = function(hash) {
        var value = null;
        if(typeof this.sockets[hash] != undefined && this.sockets[hash] != null) {
            var sockets = this.sockets[hash];
            if(sockets.length > 0) {
                value = sockets[sockets.length-1];
                // to reverse the logic and acccess the slots in Queue-style (FIFO), 
                // switch the line above to `value = sockets[0];`
            }
        }
        return value;
    };

    /**
     * returns an one-dimension array containing only the top sockets in each slot
     *
     * @return {Array}
     */
    Map.prototype.getList = function() {
        var results = [];
        for(var hash in this.sockets) {
            results.push(this.get(hash));
        }
        return results;
    };

    /**
     * for debugging purposes
     */
    Map.prototype.debug = function() {
        log.debug('socketMap snapshot:');
        for(var hash in this.sockets) {
            var sockets = this.sockets[hash];
            log.debug( hash + ' > ' + sockets.length );
        }
    };

    return Map;
})();

var onlineSockets = new SocketMap();

// emit events to the top sockets of all slots, excluding the `senderSocket`
var broadcastEvent = function(eventName, data, senderSocket) {
    senderSocket = senderSocket || false;
    var allSockets = onlineSockets.getList(), currSocket, qtyNotified = 0;
    onlineSockets.debug();
    for(var i=0; i < allSockets.length; i++) {
        currSocket = allSockets[i];
        if(senderSocket && senderSocket == currSocket) {
            continue;
        }
        if(currSocket != null) {
            qtyNotified++;
            currSocket.emit(eventName, data);
        }
    }
    log.info(qtyNotified + ' sockets where notified');
};

// API
app.get('/', function (req, res){
    res.send(fs.readFileSync('index.html', 'utf-8'));
    log.debug('web console accessed..');
});


app.post('/events', function (req, res) {
    var data = req.body;
    log.info('POST /events');

    // verifies the data is indeed valid
    // since Express automatically parses JSON body, it should be an object and not empty
    if(typeof data == 'object' && data != {}) {
        log.debug(JSON.stringify(data));
        res.send({status: "success"}); // note the asynchronicity
        log.debug('returned success status');

        // notify clients after we are done responding
        setTimeout(function(){
            log.debug('pushing updates to subscribers..');
            broadcastEvent('newMessage', data);
        }, 1);
    } else { // express couldn't parse the body
        log.error('error parsing the request body');
        log.error(data);
    }
});


// sockets
io.sockets.on('connection', function(sock){
    sock.on('message', function(data){
        var addr = sock.handshake.address;
        broadcastEvent('newMessage', data, sock);

        log.debug('event pusblished via WebSocket');
        log.debug(JSON.stringify(data));
    });

    sock.on('register', function(data){
        var hash = data.hash;
        if(!hash) {
            log.error('socket was not registed - the hash was not provided');
            log.error('data received: ' + JSON.stringify(data));
            return;
        }
        log.debug('registering new socket with hash: ' + hash);
        onlineSockets.add(hash, sock);
    });

    sock.on('close', function(){
        log.debug('removing a socket via CLOSE event');
        onlineSockets.remove(sock);
    });

    sock.on('disconnect', function(){
        log.debug('removing a socket via DISCONNECT event');
        onlineSockets.remove(sock);
    });
});

// uncomment bellow if you're having issues hosting it on AppFog or Heroku
// due to no support for WebSockets, to date
/*
io.configure(function() {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 5);
    io.set("close timeout", 10);
});
*/

// executar
log.info('listening on port ' + listenPort + '..');
server.listen(listenPort);