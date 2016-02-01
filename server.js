var http = require("http");
var fs = require("fs");
var io = require("socket.io");
var config = require("./config");

var app = http.createServer(function (req, res) {
	fs.readFile("./index.html", "utf-8", function(error, content) {
		res.writeHead(200, {"Content-Type" : "text/html"});
		res.end(content);
	});
});

var lounges = [];
lounges = [
{"loungeName" : "Salon 1", "loungePassword" : "mdp1",  "loungeDescription" : "Coucou 1"}, 
{"loungeName" : "Salon 2", "loungePassword" : "mdp2",  "loungeDescription" : "Pas de description"}, 
{"loungeName" : "Salon 3", "loungePassword" : "mdp3",  "loungeDescription" : "Lorem ipsum dolor sit amet"}]

io = io.listen(app); 

io.sockets.on("connection", function (socket) {
	console.log("New client connected");

	socket.emit("retrieveLounges", lounges);

	socket.on("newLounge", function (loungeInfo) {
		if (loungeInfo.loungeName == "") {
			socket.emit("errorMessage", "Veuillez mettre un nom");
			return false;
		}
		else if (loungeInfo.loungeName.length >= 25) {
			socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 25 caractères");
			return false;
		}
		else if (loungeInfo.loungePassword == "") {
			socket.emit("errorMessage", "Veuillez mettre un mot de passe");
			return false;
		}
		else if (loungeInfo.loungePassword.length >= 100) {
			socket.emit("errorMessage", "Veuillez mettre un mot de passe inférieur à 100 caractères");
			return false;
		}
		else if (loungeInfo.loungeDescription.length >= 50) {
			socket.emit("errorMessage", "Veuillez mettre une description inférieure à 50 caractères");
			return false;
		}

		if (loungeInfo.loungeDescription == "") {
			loungeInfo.loungeDescription = "Pas de description";
		}

		console.log("New lounge created : Name : " + loungeInfo.loungeName + ", Password : " + loungeInfo.loungePassword + ", Description : " + loungeInfo.loungeDescription);
		
		lounges.push(loungeInfo);

		io.sockets.emit("retrieveNewLounge", loungeInfo);
	});
});

app.listen(config.serverport, config.serverip);