const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin: "*"}
});

class Player {
    name: string;
}

class Session {
    players: Player[] = [];
    round: int = 0;
}

const sessions: Set<Session> = {};

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("player connected: ", socket.id);

    socket.on("join_session", ({player_name, session_code}) => {
        if (!sessions[session_code]) {
            sessions[session_code] = new Session();
        }

        const session = sessions[session_code];

        if (session.round > 0) {
            socket.emit("error", {message: "Game already started."});
            return;
        }

        const nameTaken = session.players.some(p => p.name.toLowerCase() === player_name.toLowerCase());
        if (nameTaken) {
            socket.emit("error", {message: "Name already taken in this session."});
            return;
        }

        session.players.push({id: socket.id, name: player_name});
        socket.join(session_code);
        socket.data.code = session_code;
        socket.data.name = player_name;

        io.to(session_code).emit("session_update", {players: session.players});
        console.log(`${player_name} joined room ${session_code}`);
    });

    socket.on("start_game", ({session_code}) => {
        if (sessions[session_code].players.length < 3) {  // adjust minimum number of players as needed
            socket.emit("error", {message: "Too few players have joined this session."});
            return;
        }

        const session = sessions[session_code];

        // distribute_roles()

        session.round = 1;
        console.log("Game started.")

        let game_winner = null;
        while (game_winner == null) {
            // manage rounds
        }
    });

    socket.on("disconnect", () => {
        const session_code = socket.data.code;
        const session = sessions[session_code];
        if (!session) return;

        session.players = session.players.filter(p => p.id !== socket.id);
        io.to(session_code).emit("session_update", {players: session.players});

        if (session.players.length < 1) {
            delete sessions[session_code];
        }

        console.log("player left:", socket.id);
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log("server running on port", process.env.PORT || 8080);
});
