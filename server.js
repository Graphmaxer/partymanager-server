var debugMode = true;

var http = require("http");
var fs = require("fs");
var io = require("socket.io");
var config = require("./config");

var app = http.createServer(function(req, res) {
    fs.readFile("./index.html", "utf-8", function(error, content) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
    });
});

var lounges = [];
lounges = [
    { "loungeName": "Salon 1", "loungePassword": "mdp", "loungeDescription": "Coucou 1", "messages": [{ "messageAuthor": "Author 1", "messageContent": "Message 1" }, { "messageAuthor": "Author 2", "messageContent": "Message 2" }], "users": [] },
    { "loungeName": "Salon 2", "loungePassword": "mdp", "loungeDescription": "Pas de description", "messages": [], "users": [] },
    { "loungeName": "Salon 3", "loungePassword": "mdp", "loungeDescription": "Lorem ipsum", "messages": [], "users": [] }
];

io = io.listen(app);

io.sockets.on("connection", function(socket) {
    if (debugMode) { console.log("New client connected with sessionId : " + socket.id); }

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
        } else if (loungeInfo.hostName == "") {
            socket.emit("errorMessage", "Veuillez mettre un nom");
            return false;
        } else if (loungeInfo.hostName.length >= 25) {
            socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 25 caractères");
            return false;
        } else if (loungeInfo.loungePassword == "") {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe");
            return false;
        } else if (loungeInfo.loungePassword.length >= 100) {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe inférieur à 100 caractères");
            return false;
        } else if (loungeInfo.loungeDescription.length >= 50) {
            socket.emit("errorMessage", "Veuillez mettre une description inférieure à 50 caractères");
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

        if (debugMode) { console.log("New lounge created : Name : " + loungeInfo.loungeName + ", Host Name : " + loungeInfo.hostName + " Password : " + loungeInfo.loungePassword + ", Description : " + loungeInfo.loungeDescription); }

        lounges.push({ "loungeName": loungeInfo.loungeName, "loungePassword": loungeInfo.loungePassword, "loungeDescription": loungeInfo.loungeDescription, "messages": [], "users": [{ "userName": loungeInfo.hostName, "userSessionId": socket.id, "isHost": true }] });
        socket.join(loungeInfo.loungeName);

        io.sockets.emit("retrieveNewLounge", { "loungeName": loungeInfo.loungeName, "loungeDescription": loungeInfo.loungeDescription });
        socket.emit("openLoungeHosting");
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

        lounges[loungeIndex].messages.push({ "messageAuthor": lounges[loungeIndex].users[userIndex].userName, "messageContent": message });

        var isHost;

        if (typeof lounges[loungeIndex].users[userIndex].isHost === "undefined") {
            isHost = false;
        } else if (lounges[loungeIndex].users[userIndex].isHost === true) {
            isHost = true;
        }

        io.to(lounges[loungeIndex].loungeName).emit("retrieveNewMessage", { "messageAuthor": lounges[loungeIndex].users[userIndex].userName, "messageContent": message, "isHost": isHost });
    });


    ////////////////////////
    // OPEN LOUNGE VOTING //
    ////////////////////////

    socket.on("openLoungeVotingRequest", function(loungeConnectionInfo) {
        if (debugMode) { console.log("Open request for : " + loungeConnectionInfo.loungeName + " with password : " + loungeConnectionInfo.loungePassword + " with name : " + loungeConnectionInfo.userName); }

        if (loungeConnectionInfo.loungePassword == "") {
            socket.emit("errorMessage", "Veuillez mettre un mot de passe");
            if (debugMode) { console.log("Request closed : no password"); }
            return false;
        }

        if (loungeConnectionInfo.userName == "") {
            socket.emit("errorMessage", "Veuillez mettre un nom");
            return false;
        } else if (loungeConnectionInfo.userName.length >= 25) {
            socket.emit("errorMessage", "Veuillez mettre un nom inférieur à 25 caractères");
            return false;
        }

        for (var i = 0; i < lounges.length; i++) {

            if (loungeConnectionInfo.loungeName == lounges[i].loungeName) {
                var loungeIndex = i;
            }
        }

        if (loungeConnectionInfo.loungePassword != lounges[loungeIndex].loungePassword) {
            socket.emit("errorMessage", "Mauvais mot de passe");
            if (debugMode) { console.log("Request closed : wrong password"); }
            return false;
        }

        for (var j = 0; j < lounges[loungeIndex].users.length; j++) {

            if (loungeConnectionInfo.userName == lounges[loungeIndex].users[j].userName) {
                socket.emit("errorMessage", "Un utilisateur est d&eacute;j&agrave; connect&eacute; avec ce nom");
                if (debugMode) { console.log("Request closed : user already connected with this name : " + loungeConnectionInfo.userName); }
                return false;
            }
        }

        lounges[loungeIndex].users.push({ "userName": loungeConnectionInfo.userName, "userSessionId": socket.id });
        socket.join(lounges[loungeIndex].loungeName);

        if (debugMode) { console.log("Request accepted"); }
        socket.emit("loungeVotingOpened");
        socket.emit("retrieveMessages", lounges[loungeIndex].messages);
        socket.emit("retrieveUsers", lounges[loungeIndex].users);
        socket.broadcast.to(lounges[loungeIndex].loungeName).emit("retrieveNewUser", loungeConnectionInfo.userName);
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

        if (debugMode) { console.log("User disconnected : " + lounges[loungeIndex].users[userIndex].userName); }
        socket.broadcast.to(lounges[loungeIndex].loungeName).emit("userListDisconnection", lounges[loungeIndex].users[userIndex].userName);
        lounges[loungeIndex].users.splice(userIndex, 1);
        //console.log(JSON.stringify(lounges, null, 4));
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

        if (debugMode) { console.log("User disconnected : " + lounges[loungeIndex].users[userIndex].userName); }
        socket.broadcast.to(lounges[loungeIndex].loungeName).emit("userListDisconnection", lounges[loungeIndex].users[userIndex].userName);
        lounges[loungeIndex].users.splice(userIndex, 1);
    });
});

app.listen(config.serverport, config.serverip);
