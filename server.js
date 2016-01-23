var app = express();

var osipaddress = process.env.OPENSHIFT_NODEJS_IP;
var osport = process.env.OPENSHIFT_NODEJS_PORT;

app.set('port', osport || 3000);
app.set('ipaddress', osipaddress);
...

var server = http.createServer(app);
var io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket){ 
    socket.emit('news', { hello: 'world' });
        socket.on('my other event', function (data) {
            console.log(data);
        });
        //some more code here
});

server.listen(app.get('port'), app.get('ipaddress'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});