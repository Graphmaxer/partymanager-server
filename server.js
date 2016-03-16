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
{"loungeName" : "Salon 1", "loungePassword" : "mdp",  "loungeDescription" : "Coucou 1", "messages" : ["test1", "test2"] },
{"loungeName" : "Salon 2", "loungePassword" : "mdp",  "loungeDescription" : "Pas de description"}, 
{"loungeName" : "Salon 3", "loungePassword" : "mdp",  "loungeDescription" : "Lorem ipsum dolor sit amet"}];

var loungesWithoutPasswords = [];
for (var i = 0; i < lounges.length; i++) {
		loungesWithoutPasswords.push({"loungeName" : lounges[i].loungeName, "loungeDescription" : lounges[i].loungeDescription});
	}

io = io.listen(app);

io.sockets.on("connection", function (socket) {

	console.log("New client connected");

	socket.emit("retrieveLounges", loungesWithoutPasswords);


	/////////////////////
	// LOUNGE CREATION //
	/////////////////////

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
		socket.emit("openLounge");
	});


	//////////
	// CHAT //
	//////////

	socket.on("newMessage", function (message) {
		if (message.messageAuthor == "") {
			socket.emit("errorMessage", "Veuillez mettre un nom");
			return false;
		}
		else if (message.messageAuthor.length >= 15) {
			socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 15 caractères");
			return false;
		}
		if (message.messageAuthor == "") {
			socket.emit("errorMessage", "Veuillez mettre un message");
			return false;
		}
		else if (message.messageContent.length >= 250) {
			socket.emit("errorMessage", "Veuillez mettre un message inférieur à 250 caractères");
			return false;
		}
		
		messages.push(message);

		io.sockets.emit("retrieveNewMessage", message);
	});


	/////////////////
	// OPEN LOUNGE //
	/////////////////
	
	socket.on("openLoungeRequest", function (loungeNameAndPassword) {
		console.log("Open request for : " + loungeNameAndPassword.loungeName);
		console.log("Password : " + loungeNameAndPassword.loungePassword);

		var loungeNameRequested = loungeNameAndPassword.loungeName;
		var loungeNameOriginal;

		for (var i = 0; i < lounges.length; i++) {
			loungeNameOriginal = lounges[i].loungeName;
			console.log(loungeNameOriginal + " " + loungeNameRequested);
			if (loungeNameOriginal == loungeNameRequested) {
				var loungeIdRequested = i;
				console.log("id" + loungeIdRequested);
			}
		}

		if(loungeNameAndPassword.loungePassword != lounges[loungeIdRequested].loungePassword) {
			socket.emit("errorMessage", "Mauvais mot de passe");
			return false;
		}


		socket.emit("loungeOpened");
		socket.emit("retrieveMessages", lounges[loungeIdRequested].messages);
	});
});

app.listen(config.serverport, config.serverip);