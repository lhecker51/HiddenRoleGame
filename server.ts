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
    isAlive: boolean = true;
    votes: number = 0;

    constructor(socket: typeof Socket, name: string) {
        this.socket = socket;
        this.name = name;
    }
}

class Session {
    code;
    players: Player[] = [];
    round: number = 0;

    constructor(code) {
        this.code = code;
    }
}

const sessions: Record<string, Session> = {};

app.use(express.static("public"));

io.on("connection", (socket: typeof Socket) => {
    let session: Session;
    let sessionSocket;

    socket.on("join_session", ({player_name, session_code}) => {
        if (!sessions[session_code]) {
            sessions[session_code] = new Session(session_code);
        }

        session = sessions[session_code];
        sessionSocket = io.to(session.code);

        if (session.round > 0) {
            socket.emit("error", {message: "Ooops! Too late. The Game already started."});
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

        sessionSocket.emit("player_joined", player_name);
    });

    socket.on("start_game", () => {
        const numberOfPlayers = session.players.length;
        if (session.round > 0) {
            socket.emit("error", {message: "Game has already started."});
            return;
        }

        if (numberOfPlayers < 1) {  // adjust minimum number of players as needed
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

        const timeoutMilliseconds: number = 10000;
        sessionSocket.emit("timer", timeoutMilliseconds);
        sleep(timeoutMilliseconds).then(handleNight);
    });

    function handleNight() {
        for (const player of session.players) {
            player.socket.emit("start_night", session.round);
            if (player.role === werewolfRole && player.isAlive) {
                sleep(2000).then(() => {
                    player.socket.emit("start_werewolf_vote")
                });
            }
        }


        const timeoutMilliseconds: number = 20000;
        sessionSocket.emit("timer", timeoutMilliseconds);
        sleep(timeoutMilliseconds).then(concludeVoting);
        proceedUnlessEnded(handleDay);
    }

    socket.on("select_werewolf", (victim) => {
        for (const player of session.players) {
            if (player.role === werewolfRole) {
                player.socket.emit("selected_werewolf", victim);
            }
        }
    });

    socket.on("vote_werewolf", (victim) => {
        for (const player of session.players) {
            if (player.name == victim) {
                player.votes++;
            }
        }
    });

    function handleDay() {
        session.round++;
        for (const player of session.players) {
            player.socket.emit("start_day", session.round);
            if (player.isAlive) {
                player.socket.emit("start_day_vote");
            }
        }
        const timeoutMilliseconds: number = 40000;
        sessionSocket.emit("timer", timeoutMilliseconds);
        sleep(timeoutMilliseconds).then(concludeVoting);
        proceedUnlessEnded(handleNight)
    }

    function concludeVoting() {
        let mostVotedPlayer: Player;
        let mostVotes: number = 0;
        let tie: boolean = true;
        for (const player of session.players) {
            if (player.votes > mostVotes) {
                mostVotedPlayer = player;
                mostVotes = player.votes;
                tie = false;
            }
            if (player.votes == mostVotes) {
                tie = true;
            }
            player.votes = 0;
        }
        mostVotedPlayer.isAlive = false;
        sessionSocket.emit("death", mostVotedPlayer.name);
    }

    function proceedUnlessEnded(func: Function) {
        let numberOfWerewolvesAlive = 0;
        let numberOfVillagersAlive = 0;
        for (const player of session.players) {
            if (!player.isAlive) continue;
            if (player.role === werewolfRole) {
                numberOfWerewolvesAlive++;
            } else {
                numberOfVillagersAlive++;
            }
        }

        if (numberOfWerewolvesAlive === 0) {
            sessionSocket.emit("village_won");
            return;
        }

        if (numberOfWerewolvesAlive > numberOfVillagersAlive) {
            sessionSocket.emit("werewolves_won");
            return;
        }

        func.call();
    }

    socket.on("disconnect", () => {
        const remainingPlayers = session.players.filter(p => p.socket.id !== socket.id);
        for (const player of session.players) {
            if (!remainingPlayers.includes(player)) {
                sessionSocket.emit("player_left", player.name);
            }
        }
        session.players = remainingPlayers;

        if (session.players.length < 1) {
            delete sessions[session.code];
        }
    });
});


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

server.listen(process.env.PORT || 8080, () => {
    console.log("Server running on port", process.env.PORT || 8080);
});
