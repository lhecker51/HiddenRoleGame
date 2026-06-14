const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin: "*"}
});

const rooms = {};

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("player connected:", socket.id);

    socket.on("join_room", ({name, code}) => {
        if (!rooms[code]) {
            rooms[code] = {players: [], round: 0};
        }

        const room = rooms[code];

        if (room.round > 0) {
            socket.emit("error", {message: "Game already started."});
            return;
        }

        const nameTaken = room.players.some(p => p.name.toLowerCase() === name.toLowerCase());
        if (nameTaken) {
            socket.emit("error", {message: "Name already taken in this session."});
            return;
        }

        room.players.push({id: socket.id, name});
        socket.join(code);
        socket.data.code = code;
        socket.data.name = name;

        io.to(code).emit("room_update", {players: room.players});
        console.log(`${name} joined room ${code}`);
    });

    socket.on("start_game", ({code}) => {
        if (rooms[code].players.length < 3) {  // adjust minimum number of players as needed
            socket.emit("error", {message: "Too few players have joined this session."});
            return;
        }

        const room = rooms[code];

        // distribute_roles()

        room.round = 1;

        let game_winner = null;
        while (game_winner == null) {
            // manage rounds
        }
    });

    socket.on("disconnect", () => {
        const code = socket.data.code;
        const room = rooms[code];
        if (!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        io.to(code).emit("room_update", {players: room.players});

        if (room.players.length === 0) {
            delete rooms[code];
        }

        console.log("player left:", socket.id);
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log("server running on port", process.env.PORT || 8080);
});