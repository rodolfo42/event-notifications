(function(){
    // you should change this to whatever the server domain:port is
    var EVENT_SERVER = "localhost:3000";
    
    // your app cookie key
    // eg. PHPSESSID or JSESSIONID
    var COOKIE_KEY = "MYCOOKIEKEY";
    
    if(window.webkitNotifications) {
        var prepareNotifications = function() {
            var hash = $.cookie(COOKIE_KEY);
            
            // just for test purposes, create a cookie with an random number
            if(typeof hash == 'undefined') {
                hash = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
                    var v = Math.random()*16|0;
                    return v.toString(16);
                });
                console.debug(hash);
                $.cookie(COOKIE_KEY, hash, {expires : 3600});
            }
            
            var webSocket = io.connect('http://' + EVENT_SERVER + '/');
            
            webSocket.on('newMessage', function(payload) {
                // sanitize event attributes
                var title = payload.title || "Notificação";
                var message = payload.message;
                
                // creates a DesktopNotification without the icon
                var n = (webkitNotifications.createNotification("", title, message));
                
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
            // this does not always work, but since there's a timeout on the server, the socket will eventually
            // be removed following a DISCONNECT event dispatch
            window.onbeforeunload = function() {
                webSocket.emit('close');
            };
        };
        
        // load socket.io.js
        // inspired and adapted from ga.js snippet
        (function() {
            var s = document.createElement('script'); s.type = 'text/javascript';
            s.src = 'http://' + EVENT_SERVER + '/socket.io/socket.io.js';
            // puts the function that prepares the event handlers after the script is loaded because it requires socket.io
            s.onload = prepareNotifications;
            var o = document.getElementsByTagName('script')[0]; o.parentNode.insertBefore(s, o);
        })();
    }
})();