import { Socket } from "socket.io";
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin: "*"}
});

class Role {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

const villagerRole: Role = new Role("Villager");
const werewolfRole: Role = new Role("Werewolf");

class Player {
    socket: Socket;
    name: string;
    role: Role = villagerRole;

    constructor(socket: Socket, name: string) {
        this.socket = socket;
        this.name = name;
    }
}

class Session {
    players: Player[] = [];
    round: number = 0;
}

const sessions: Record<string, Session> = {};

app.use(express.static("public"));

io.on("connection", (socket: Socket) => {
    console.log("Player connected:", socket.id);

    socket.on("join_session", ({player_name, session_code}) => {
        console.log("Join request received.");
        if (!sessions[session_code]) {
            sessions[session_code] = new Session();
        }

        const session = sessions[session_code];

        if (session.round > 0) {
            socket.emit("error", {message: "Game already started."});
            return;
        }

        const nameTaken = session.players.some(p => p.name.toLowerCase() == player_name.toLowerCase());
        if (nameTaken) {
            socket.emit("error", {message: "Name already taken in this session."});
            return;
        }

        if (player_name.length > 20) {
            socket.emit("error", {message: "Name is too long."});
            return;
        }

        socket.emit("join_success");

        for (const player of session.players) {
            socket.emit("player_joined", player.name);
        }

        session.players.push(new Player(socket, player_name));
        socket.join(session_code);
        socket.data.code = session_code;
        socket.data.name = player_name;

        io.to(session_code).emit("player_joined", player_name);
        console.log(`${player_name} joined room ${session_code}`);
    });

    socket.on("start_game", (session_code) => {
        console.log("Start request received.");
        const session = sessions[session_code];
        const numberOfPlayers = session.players.length;

        if (session.round > 0) {
            socket.emit("error", {message: "Game has already started."});
            return;
        }

        if (numberOfPlayers < 1) {  // adjust minimum number of players as needed
            socket.emit("error", {message: "Too few players have joined this session."});
            return;
        }

        socket.emit("start_successful");

        session.round = 1;

        let numberOfWerewolves = 0;
        while (numberOfWerewolves < Math.ceil(numberOfPlayers / 5.0)) {
            const randomIndex = Math.floor(Math.random() * numberOfPlayers);
            const player = session.players[randomIndex];
            if (player.role === villagerRole) {
                player.role = werewolfRole;
                numberOfWerewolves++;
            }
        }

        console.log("Game started.")

        for (const player of session.players) {
            player.socket.emit("role_update", player.role.name);
        }

        const werewolfList: Player[] = session.players.filter(p => p.role === werewolfRole);
        for (const player of session.players) {
            if (werewolfList.includes(player)) {
                player.socket.emit("werewolf_list", werewolfList.map(p => p.name));
            }
        }

        // todo manage rounds here, start with day, other typescript file?
    });

    socket.on("disconnect", () => {
        const session_code = socket.data.code;
        const session = sessions[session_code];
        if (!session) return;

        const remainingPlayers = session.players.filter(p => p.socket.id !== socket.id);
        for (const player of session.players) {
            if (!remainingPlayers.includes(player)) {
                io.to(session_code).emit("player_left", player.name);
            }
        }
        session.players = remainingPlayers;

        if (session.players.length < 1) {
            delete sessions[session_code];
        }

        console.log("player left:", socket.id);
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log("Server running on port", process.env.PORT || 8080);
});
