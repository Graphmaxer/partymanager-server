var express = require('express');var app = express();)
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

server.listen(process.env.OPENSHIFT_NODEJS_PORT, process.env.OPENSHIFT_NODEJS_IP);