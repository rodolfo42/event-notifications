(function(){
    // you can specify the event server address from a global variable `EVENT_SERVER`
    // default - get from the current host
    var eventServer = (window.EVENT_SERVER || window.location.host);
    
    // your app cookie key
    // eg. PHPSESSID or JSESSIONID
    var COOKIE_KEY = "MYCOOKIEKEY";
    
    if(window.webkitNotifications) {
        var prepareNotifications = function() {
            var hash = $.cookie(COOKIE_KEY);
            
            // just for test purposes, create a cookie with an random number
            // inspired by http://stackoverflow.com/a/2117523
            if(typeof hash == 'undefined') {
                hash = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
                    var v = Math.random()*16|0;
                    return v.toString(16);
                });
                console.debug(hash);
                $.cookie(COOKIE_KEY, hash, {expires : 3600});
            }
            
            var webSocket = io.connect('http://' + eventServer + '/');
            
            webSocket.on('newMessage', function(payload) {
                // sanitize event attributes
                var title = payload.title;
                var message = payload.message;
                var iconUrl = payload.iconUrl || ( window.location.protocol + '//' + eventServer + '/img/icon.png');
                
                // creates a DesktopNotification without the icon
                var n = (webkitNotifications.createNotification(iconUrl, title, message));
                
                // when clicked, the notification should close and the user redirected to the URL, if provided
                n.onclick = function(e) {
                    if(payload.url) {
                        // open url in new tab
                        window.open(payload.url, '_blank');
                    } else {
                        // otherwise, bring the tab into focus
                        window.focus();
                    }
                    // closes the notification popup
                    this.close();
                };
                
                n.show(); // important - display the notification!
            });
            
            webSocket.on('connect', function() {
                var data = {"hash": hash};
                console.log('registering: '+JSON.stringify(data));
                webSocket.emit('register', data);
            });
            
            // send a CLOSE event to the server in order to remove the socket from the active sockets map
            // this is just in case of using xhr-polling as the socket's transport, since WebSockets are instantly closed

            // does not always work, but since there's a timeout on the server, the socket will eventually
            // be removed when a DISCONNECT event happens on the server
            window.onbeforeunload = function() {
                webSocket.emit('close');
            };
        };
        
        // load socket.io.js
        // inspired and adapted from ga.js snippet
        (function() {
            var s = document.createElement('script'); s.type = 'text/javascript';
            s.src = 'http://' + eventServer  + '/socket.io/socket.io.js';
            // puts the function that prepares the event handlers after the script is loaded because it requires socket.io
            s.onload = prepareNotifications;
            var o = document.getElementsByTagName('script')[0]; o.parentNode.insertBefore(s, o);
        })();
    }
})();