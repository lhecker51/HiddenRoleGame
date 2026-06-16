const express = require("express");
const http = require("http");
const {Server, Socket} = require("socket.io");

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
    socket: typeof Socket;
    name: string;
    role: Role = villagerRole;

    constructor(socket: typeof Socket, name: string) {
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

io.on("connection", (socket: typeof Socket) => {
    socket.on("join_session", ({player_name, session_code}) => {
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
    });

    socket.on("start_game", (session_code) => {
        const session = sessions[session_code];
        const numberOfPlayers = session.players.length;

        if (session.round > 0) {
            socket.emit("error", {message: "Game has already started."});
            return;
        }

        if (numberOfPlayers < 2) {  // adjust minimum number of players as needed
            socket.emit("error", {message: "Too few players have joined this session."});
            return;
        }

        session.round = 1;
        socket.emit("start_success")

        let numberOfWerewolves = 0;
        while (numberOfWerewolves < Math.ceil(numberOfPlayers / 5.0)) {
            const randomIndex = Math.floor(Math.random() * numberOfPlayers);
            const player = session.players[randomIndex];
            if (player.role === villagerRole) {
                player.role = werewolfRole;
                numberOfWerewolves++;
            }
        }

        for (const player of session.players) {
            player.socket.emit("role_update", player.role.name);
        }

        const werewolfList: Player[] = session.players.filter(p => p.role === werewolfRole);
        for (const player of session.players) {
            if (werewolfList.includes(player)) {
                player.socket.emit("werewolf_list", werewolfList.map(p => p.name));
            }
        }

        handleNight(session);
    });

    function handleNight(session: Session) {
        for (const player of session.players) {
            player.socket.emit("start night", session.round);
            if (player.role === werewolfRole) {
                player.socket.emit("start_werewolf_vote");
            }
        }
    }

    socket.on("select_werewolf", (victim) => {
        for (const player of session.players) {
            if (player.role === werewolfRole) {
                player.socket.emit("selected_werewolf", victim);
            }
        }
    });

    function handleDay(session: Session) {
    }

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
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log("Server running on port", process.env.PORT || 8080);
});
