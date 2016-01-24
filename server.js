var http = require("http");
var fs = require("fs");
var io = require("socket.io");
var config = require("./config");	

// Creation du serveur
var app = http.createServer(function (req, res) {
	fs.readFile("./index.html", "utf-8", function(error, content) {
		res.writeHead(200, {"Content-Type" : "text/html"});
		res.end(content);
	});
});

var lounges = [];
var loungeNumber = 0;

io = io.listen(app); 

io.sockets.on("connection", function (socket) {
	console.log("New client connected");

	socket.emit("retrieveLounges", lounges);

	socket.on("newLounge", function (loungeInfo) {
		
		lounges.push(loungeInfo);

		console.log("New lounge created : Name : " + lounges[loungeNumber].loungeName + ", Password : " + lounges[loungeNumber].loungePassword + ", Description : " + lounges[loungeNumber].loungeDescription);

		loungeNumber = loungeNumber + 1;
	});
});

///////////////////

// Notre application ecoute sur le port 8080
app.listen(config.serverport, config.serverip);
console.log("Live Chat App running at http://localhost:8080/");