var debugMode = true;
var resumeSessionMode = false;

var http = require("http");
var https = require("https");
var fs = require("fs");
var io = require("socket.io");
var config = require("./config");
var ignored = require("./ignored/apiKey");

var apiKey = ignored.apiKey;

var app = http.createServer(function(req, res) {
	fs.readFile("./index.html", "utf-8", function(error, content) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
    });
});

var disconnectedUsersWaiting = [];

var lounges = [];
lounges = [{ "loungeName": "Debug", "loungePassword": "mdp", "loungeDescription": "Debug", "messages": [], "users": [{ "userName": "Debug", "userSessionId": "", "isHost": true }], "music":[] },
{ "loungeName": "Debug2", "loungePassword": "mdp", "loungeDescription": "Debug2", "messages": [], "users": [{ "userName": "Debug", "userSessionId": "", "isHost": true }], "music":[] }];

io = io.listen(app);

io.sockets.on("connection", function(socket) {
    if (debugMode) { console.log("New client connected with sessionId : '" + socket.id + "'"); }

    var loungesWithoutPasswords = [];
    for (var i = 0; i < lounges.length; i++) {
        loungesWithoutPasswords.push({ "loungeName": lounges[i].loungeName, "loungeDescription": lounges[i].loungeDescription });
    }

    socket.emit("retrieveLounges", loungesWithoutPasswords);

    /////////////////////
    // LOUNGE CREATION //
    /////////////////////

    socket.on("newLounge", function(loungeInfo) {
        if (loungeInfo.loungeName == "") {
            socket.emit("errorMessage", "Veuillez mettre un nom de salon");
            return false;
        } else if (loungeInfo.loungeName.length >= 25) {
            socket.emit("errorMessage", "Veuillez mettre un nom de salon inférieur à 25 caractères");
            return false;
        } 

        if (/^[a-zA-Z0-9 ]+$/.test(loungeInfo.loungeName)) {
        } else {
        	socket.emit("errorMessage", "Vous pouvez seulement mettre un nom de salon avec des lettres, des chiffres et des espaces");
            return false;
        }


        if (loungeInfo.hostName == "") {
            socket.emit("errorMessage", "Veuillez mettre un nom");
            return false;
        } else if (loungeInfo.hostName.length >= 25) {
            socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 25 caractères");
            return false;
        }

        if (/^[a-zA-Z0-9]+$/.test(loungeInfo.hostName)) {	
        } else {
        	socket.emit("errorMessage", "Vous pouvez seulement mettre un nom avec des lettres et des chiffres");
            return false;
        }


        if (loungeInfo.loungePassword == "") {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe");
            return false;
        } else if (loungeInfo.loungePassword.length >= 50) {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe inférieur à 50 caractères");
            return false;
        } else if (loungeInfo.loungeDescription.length >= 40) {
            socket.emit("errorMessage", "Veuillez mettre une description inférieure à 40 caractères");
            return false;
        }

        if (/^[a-zA-Z0-9 ]*$/.test(loungeInfo.loungeDescription)) {	
        } else {
        	socket.emit("errorMessage", "Vous pouvez seulement mettre une description avec des lettres, des chiffres et des espaces");
            return false;
        }


        for (var i = 0; i < lounges.length; i++) {

            if (loungeInfo.loungeName == lounges[i].loungeName) {
                socket.emit("errorMessage", "Ce nom de salon est déjà utlisé");
                return false;
            }
        }

        if (loungeInfo.loungeDescription == "") {
            loungeInfo.loungeDescription = "Pas de description";
        }

        if (debugMode) { console.log("New lounge created : Name : '" + loungeInfo.loungeName + "', Host Name : '" + loungeInfo.hostName + "', Description : '" + loungeInfo.loungeDescription + "'"); }

        lounges.push({ "loungeName": loungeInfo.loungeName, "loungePassword": loungeInfo.loungePassword, "loungeDescription": loungeInfo.loungeDescription, "messages": [], "users": [{ "userName": loungeInfo.hostName, "userSessionId": socket.id, "isHost": true }], "music":[] });
        socket.join(loungeInfo.loungeName);

        io.sockets.emit("retrieveNewLounge", { "loungeName": loungeInfo.loungeName, "loungeDescription": loungeInfo.loungeDescription });
        socket.emit("openLoungeHosting");
        socket.emit("retrieveUsers", [{ "userName": loungeInfo.hostName, "isHost": true }]	);
    });


    //////////
    // CHAT //
    //////////

    socket.on("newMessage", function(message) {
        if (message == "") {
            socket.emit("errorMessage", "Veuillez mettre un message");
            console.log(message);
            return false;
        } else if (message.length >= 250) {
            socket.emit("errorMessage", "Veuillez mettre un message inférieur à 250 caractères");
            return false;
        }

        for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        }

        var isHost;

        if (typeof lounges[loungeIndex].users[userIndex].isHost === "undefined") {
            isHost = false;
        } else if (lounges[loungeIndex].users[userIndex].isHost === true) {
            isHost = true;
        }
        
        lounges[loungeIndex].messages.push({ "messageAuthor": lounges[loungeIndex].users[userIndex].userName, "messageContent": message, "isHost": isHost });
        io.to(lounges[loungeIndex].loungeName).emit("retrieveNewMessage", { "messageAuthor": lounges[loungeIndex].users[userIndex].userName, "messageContent": message, "isHost": isHost });
    });


    ////////////////////////
    // OPEN LOUNGE VOTING //
    ////////////////////////

    socket.on("openLoungeVotingRequest", function(loungeConnectionInfo) {
        if (loungeConnectionInfo.loungePassword == "") {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe");
            return false;
        }

        if (loungeConnectionInfo.userName == "") {
            socket.emit("errorMessage", "Veuillez mettre un nom");
            return false;
        } else if (loungeConnectionInfo.userName.length >= 25) {
            socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 25 caractères");
            return false;
        }

        if (/^[a-zA-Z0-9]+$/.test(loungeConnectionInfo.userName)) {    	
        } else {
        	socket.emit("errorMessage", "Vous pouvez seulement mettre un nom avec des lettres et des chiffres");
            return false;
        }

        for (var i = 0; i < lounges.length; i++) {

            if (loungeConnectionInfo.loungeName == lounges[i].loungeName) {
                var loungeIndex = i;
            }
        }

        if (loungeConnectionInfo.loungePassword != lounges[loungeIndex].loungePassword) {
            socket.emit("errorMessage", "Mauvais mot de passe");
            return false;
        }

        for (var k = 0; k < lounges[loungeIndex].users.length; k++) {
            if (loungeConnectionInfo.userName == lounges[loungeIndex].users[k].userName) {
                socket.emit("errorMessage", "Un utilisateur est d&eacute;j&agrave; connect&eacute; avec ce nom");
                return false;
            }

            if (resumeSessionMode) {
            	if (loungeConnectionInfo.clientIdCookies[loungeConnectionInfo.loungeName] == lounges[loungeIndex].users[k].userSessionId) {
            		socket.emit("errorMessage", "Veuillez patientez pour la reprise de votre session");
                	return false;
            	}
            }
        }

        var resumeSession = false;

        if (resumeSessionMode) {
        	for (var i = 0; i < disconnectedUsersWaiting.length; i++) {
        		if (loungeConnectionInfo.userName == disconnectedUsersWaiting[i].userName && loungeConnectionInfo.loungeName == disconnectedUsersWaiting[i].lounge) {
        			socket.emit("errorMessage", "Un utilisateur s'est déjà connecté avec ce pseudo dans ce salon");
        			return false;
        		
        		}
        	}
        

	        for (var propName in loungeConnectionInfo.clientIdCookies) {       	
	        	if (propName == loungeConnectionInfo.loungeName) {
	        		var requestedLoungeNameForResume = propName;
	        	}
	        }

	       	for (var i = 0; i < disconnectedUsersWaiting.length; i++) {
	       		if (disconnectedUsersWaiting[i].userSessionId == "/#" + loungeConnectionInfo.clientIdCookies[requestedLoungeNameForResume] && disconnectedUsersWaiting[i].lounge == loungeConnectionInfo.loungeName && requestedLoungeNameForResume == loungeConnectionInfo.loungeName) {

	       			if (disconnectedUsersWaiting[i].lounge != loungeConnectionInfo.loungeName) {
	       				break;
	       			}
	       			
	       			resumeSession = true;

	       			lounges[loungeIndex].users.push({ "userName": disconnectedUsersWaiting[i].userName, "userSessionId": socket.id, "likedMusic": disconnectedUsersWaiting[i].likedMusic, "dislikedMusic": disconnectedUsersWaiting[i].dislikedMusic });
	       			socket.join(disconnectedUsersWaiting[i].userName);		
	       			socket.emit("resumeSession", disconnectedUsersWaiting[i].userName);
	       			disconnectedUsersWaiting.splice(i, 1);
	       		}
	       	}
	    }

       	if (resumeSession == false) {
       		lounges[loungeIndex].users.push({ "userName": loungeConnectionInfo.userName, "userSessionId": socket.id, "likedMusic": [], "dislikedMusic": [] });
       		socket.join(lounges[loungeIndex].loungeName);
       	}

       	for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        } 

        var usersWithoutId = [];

        for (var k = 0; k < lounges[loungeIndex].users.length; k++) {
        	if (lounges[loungeIndex].users[k].isHost == true ) {
        		usersWithoutId.push({"userName" : lounges[loungeIndex].users[k].userName, "isHost" : true });
        	}
        	else {
        		usersWithoutId.push({"userName" : lounges[loungeIndex].users[k].userName });
        	}
        }

        if (debugMode) { console.log("'" + lounges[loungeIndex].users[userIndex].userName + "' connected to '" + lounges[loungeIndex].loungeName + "'"); }
        socket.emit("loungeVotingOpened", { "userName": lounges[loungeIndex].users[userIndex].userName, "loungeName": lounges[loungeIndex].loungeName });
        socket.emit("retrieveMessages", lounges[loungeIndex].messages);
        socket.emit("retrieveUsers", usersWithoutId);
        socket.emit("retrieveMusic", lounges[loungeIndex].music);
        socket.emit("retrieveLikedAndDislikedMusic", { "likedMusic": lounges[loungeIndex].users[userIndex].likedMusic, "dislikedMusic": lounges[loungeIndex].users[userIndex].dislikedMusic })
        socket.broadcast.to(lounges[loungeIndex].loungeName).emit("retrieveNewUser", lounges[loungeIndex].users[userIndex].userName);
    });


    ///////////
    // MUSIC /
    ///////////

    socket.on("musicAdded", function(videoId) {
    	https.get("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + videoId + "&key=" + apiKey, function(res) {
    		var data = "";

    		res.on("data", function(chunk) {
        		data += chunk;
    		});

    		res.on("end", function() {
        		var decodedJsonVideo = JSON.parse(data);

        		if (decodedJsonVideo.items.length == "0") {
        			socket.emit("errorMessage", "Cette vidéo n'existe pas");
        			return false;
        		}

        		var thumbnailLink = decodedJsonVideo.items[0].snippet.thumbnails.medium.url;

        		var title =  decodedJsonVideo.items[0].snippet.title;

        		https.get("https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=" + videoId + "&key=" + apiKey, function(resTwo) {
    				var dataTwo = "";

    				resTwo.on("data", function(chunkTwo) {
        				dataTwo += chunkTwo;
    				});

    				resTwo.on("end", function() {

    						var decodedJsonVideoDuration = JSON.parse(dataTwo);

    						var durationISO = decodedJsonVideoDuration.items[0].contentDetails.duration;

    						var match = durationISO.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  							var hours = (parseInt(match[1]) || "");
  							if (hours < 10 && hours != 0) { hours = "0" + hours; }
  							var minutes = (parseInt(match[2]) || "00");
  							if (minutes < 10 && minutes != 0) { minutes = "0" + minutes; }
  							var seconds = (parseInt(match[3]) || "00");
  							if (seconds < 10 && seconds != 0) { seconds = "0" + seconds; }

  							if (hours == "") {
  								var duration = minutes + ":" + seconds;
  							}
  							else {
  								var duration = hours + ":" + minutes + ":" + seconds;
  							}

        					for (var i = 0; i < lounges.length; i++) {
            					for (var j = 0; j < lounges[i].users.length; j++) {
                					if (socket.id == lounges[i].users[j].userSessionId) {
                    					var loungeIndex = i;
                    					var userIndex = j;
                					}
            					}
        					}

        					for (var j = 0; j < lounges[loungeIndex].music.length; j++) {
        						if (lounges[loungeIndex].music[j].videoId == videoId) {
        							socket.emit("errorMessage", "Cette musique est déja dans la playlist du salon");
        							return false;
        						}
        					}

        					lounges[loungeIndex].music.push({ "videoId": videoId, "thumbnailLink": thumbnailLink, "duration": duration, "title": title, "score" : 1 });
        					io.to(lounges[loungeIndex].loungeName).emit("retrieveNewMusic", { "videoId": videoId, "thumbnailLink": thumbnailLink, "duration": duration, "title": title, "score": 0 });

        					lounges[loungeIndex].users[userIndex].likedMusic.push(videoId);
        					socket.emit("retrieveNewLikedMusic", videoId);
        					io.to(lounges[loungeIndex].loungeName).emit("addScore", videoId);
        			});
        		});
    		});
		});
    });

    socket.on("upVote", function(videoId) {
    	for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        }

        var musicFound = false;
        for (var i = 0; i < lounges[loungeIndex].music.length; i++) {
        	if (lounges[loungeIndex].music[i].videoId == videoId) {
        		var musicIndex = i;
        		musicFound = true;
        	}
        }

        if (musicFound == false) {
        	socket.emit("errorMessage", "Video non trouvée dans ce salon");
        	return false;
        }

        if (lounges[loungeIndex].users[userIndex].likedMusic.indexOf(videoId) != -1) {
        	socket.emit("errorMessage", "Vous avez déjà voté pour cette vidéo");
        	return false;
        }

        if (lounges[loungeIndex].users[userIndex].dislikedMusic.indexOf(videoId) != -1) {
        	lounges[loungeIndex].users[userIndex].dislikedMusic.splice(lounges[loungeIndex].users[userIndex].dislikedMusic.indexOf(videoId), 1);
        }

        lounges[loungeIndex].music[musicIndex].score++;
        lounges[loungeIndex].users[userIndex].likedMusic.push(videoId);
        socket.emit("retrieveNewLikedMusic", videoId);
        io.to(lounges[loungeIndex].loungeName).emit("addScore", videoId);
    });

    socket.on("downVote", function(videoId) {
    	for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        }

        var musicFound = false;
        for (var i = 0; i < lounges[loungeIndex].music.length; i++) {
        	if (lounges[loungeIndex].music[i].videoId == videoId) {
        		var musicIndex = i;
        		musicFound = true;
        	}
        }

        if (musicFound == false) {
        	socket.emit("errorMessage", "Video non trouvée dans ce salon");
        	return false;
        }

        if (lounges[loungeIndex].users[userIndex].dislikedMusic.indexOf(videoId) != -1) {
        	socket.emit("errorMessage", "Vous avez déjà voté pour cette vidéo");
        	return false;
        }

        if (lounges[loungeIndex].users[userIndex].likedMusic.indexOf(videoId) != -1) {
        	lounges[loungeIndex].users[userIndex].likedMusic.splice(lounges[loungeIndex].users[userIndex].likedMusic.indexOf(videoId), 1);
        }

        lounges[loungeIndex].music[musicIndex].score--;
        lounges[loungeIndex].users[userIndex].dislikedMusic.push(videoId);
        socket.emit("retrieveNewDislikedMusic", videoId);
        io.to(lounges[loungeIndex].loungeName).emit("minusScore", videoId);
    });

    ///////////////////
    // DISCONNECTION //
    ///////////////////

    socket.on("disconnect", function() {
        for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        }

        if (typeof lounges[loungeIndex] == "undefined") {
            if (debugMode) { console.log("Unknow user disconnected"); }
            return false;
        }

        if (lounges[loungeIndex].users[userIndex].isHost == true) {
        	if (debugMode) { console.log("Host disconnected : '" + lounges[loungeIndex].users[userIndex].userName + "', lounge '" + lounges[loungeIndex].loungeName + "' deleted") }
        	socket.broadcast.emit("loungeDeleted", lounges[loungeIndex].loungeName);
        	socket.broadcast.to(lounges[loungeIndex].loungeName).emit("loungeClosedForUsers");
        	socket.broadcast.to(lounges[loungeIndex].loungeName).emit("errorMessage", "L'hôte '" + lounges[loungeIndex].users[userIndex].userName + "' s'est déconnecté")
        	lounges.splice(loungeIndex, 1);
        }
        else {
        	if (debugMode) { console.log("User disconnected : '" + lounges[loungeIndex].users[userIndex].userName + "' from '"  + lounges[loungeIndex].loungeName + "'"); }

        	var disconnectedUserInfo = lounges[loungeIndex].users[userIndex];
        	disconnectedUserInfo["lounge"] = lounges[loungeIndex].loungeName;
        	disconnectedUsersWaiting.push(disconnectedUserInfo);
        	socket.broadcast.to(lounges[loungeIndex].loungeName).emit("userListDisconnection", lounges[loungeIndex].users[userIndex].userName);
        	lounges[loungeIndex].users.splice(userIndex, 1);
    	}
    });

    socket.on("userDisconnection", function() {
        for (var i = 0; i < lounges.length; i++) {
            for (var j = 0; j < lounges[i].users.length; j++) {
                if (socket.id == lounges[i].users[j].userSessionId) {
                    var loungeIndex = i;
                    var userIndex = j;
                }
            }
        }

        if (typeof lounges[loungeIndex] == "undefined") {
            if (debugMode) { console.log("Unknow user disconnected"); }
            return false;
        }

        if (debugMode) { console.log("User disconnected : '" + lounges[loungeIndex].users[userIndex].userName + "' from '" + lounges[loungeIndex].loungeName + "'"); }

        var disconnectedUserInfo = lounges[loungeIndex].users[userIndex];
        disconnectedUserInfo["lounge"] = lounges[loungeIndex].loungeName;
        disconnectedUsersWaiting.push(disconnectedUserInfo);
        socket.broadcast.to(lounges[loungeIndex].loungeName).emit("userListDisconnection", lounges[loungeIndex].users[userIndex].userName);
        lounges[loungeIndex].users.splice(userIndex, 1);
    });

    
    
});

app.listen(config.serverport, config.serverip);
