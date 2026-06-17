import express from "express";
import http from "http";
import {Server, Socket} from "socket.io";

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
const seerRole: Role = new Role("Seer");

class Player {
    socket: Socket;
    name: string;
    role: Role = villagerRole;
    isAlive: boolean = true;
    votes: number = 0;
    currentSelection: string | null = null;

    constructor(socket: Socket, name: string) {
        this.socket = socket;
        this.name = name;
    }
}

class Session {
    code: string;
    players: Player[] = [];
    round: number = 0;

    constructor(code: string) {
        this.code = code;
    }

    broadcast(code: string, data?: any) {
        return io.to(this.code).emit(code, data);
    }
}

const sessions: Record<string, Session> = {};

app.use(express.static("public"));

io.on("connection", (socket: Socket) => {
    let session: Session;

    socket.on("join_session", ({player_name, session_code}) => {
        if (!sessions[session_code]) {
            sessions[session_code] = new Session(session_code);
        }

        session = sessions[session_code];

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

        session.broadcast("player_joined", player_name);
    });

    socket.on("start_game", async () => {
        if (!session) {
            socket.emit("error", {message: "You are not in an active game session."});
            return;
        }

        if (session.round > 0) {
            socket.emit("error", {message: "Game has already started."});
            return;
        }

        if (session.players.length < 1) {  // adjust minimum number of players as needed
            socket.emit("error", {message: "Too few players have joined this session."});
            return;
        }

        session.round = 1;
        socket.emit("start_success")

        distributeRoles(session.players);
        sendRoleUpdates(session.players);

        const timeoutMilliseconds: number = 10000;
        session.broadcast("timer", {name: "role-timer", time: timeoutMilliseconds});
        await sleep(timeoutMilliseconds);
        await handleNight(session);
    });

    socket.on("werewolf_vote_changed", ({victim}) => {
        if (!session) return;

        const currentPlayer = session.players.find(p => p.socket.id === socket.id);
        if (!currentPlayer || currentPlayer.role !== werewolfRole || !currentPlayer.isAlive) return;

        currentPlayer.currentSelection = victim;
        const votesMap: Record<string, string> = {};
        for (const player of session.players) {
            if (player.role === werewolfRole && player.isAlive && player.currentSelection) {
                votesMap[player.name] = player.currentSelection;
            }
        }

        for (const player of session.players) {
            if (player.role === werewolfRole) {
                player.socket.emit("werewolf_votes_update", {votes: votesMap});
            }
        }
    });

    socket.on("vote", (voted) => {
        for (const player of session.players) {
            if (player.name == voted) {
                player.votes++;
            }
        }
    });

    socket.on("seer_role_reveal_request", (player_name) => {
        for (const player of session.players) {
            if (player.name == player_name) {
                socket.emit("seer_role_reveal", player.role.name);
            }
        }
    });

    socket.on("restart_game", () => {
        socket.emit("debug", "Restarting game...");
        session.round = 0;
        for (const player of session.players) {
            player.role = villagerRole;
            player.isAlive = true;
            player.votes = 0;
            player.currentSelection = null;
        }
    });

    socket.on("disconnect", () => {
        const sessionCode = socket.data.code;
        if (!sessionCode || !sessions[sessionCode]) return;

        const session = sessions[sessionCode];
        const remainingPlayers = session.players.filter(p => p.socket.id !== socket.id);
        for (const player of session.players) {
            if (!remainingPlayers.includes(player)) {
                session.broadcast("player_left", player.name);
                session.broadcast("death", player.name);
            }
        }
        session.players = remainingPlayers;

        if (session.players.length < 1) {
            delete sessions[session.code];
        }
    });
});

function distributeRoles(players: Player[]) {
    let numberOfWerewolves = 0;
    while (numberOfWerewolves < Math.ceil(players.length / 5.0)) {
        const randomIndex = Math.floor(Math.random() * players.length);
        const player = players[randomIndex];
        if (player.role === villagerRole) {
            player.role = werewolfRole;
            numberOfWerewolves++;
        }
    }

    if (players.length < 4) return;

    let numberOfSeers = 0;
    while (numberOfSeers < Math.ceil(players.length / 8.0)) {
        const randomIndex = Math.floor(Math.random() * players.length);
        const player = players[randomIndex];
        if (player.role === villagerRole) {
            player.role = seerRole;
            numberOfSeers++;
        }
    }
}

function sendRoleUpdates(players: Player[]) {
    for (const player of players) {
        player.socket.emit("role_update", player.role.name);
    }

    const werewolfList: Player[] = players.filter(p => p.role === werewolfRole);
    for (const player of players) {
        if (werewolfList.includes(player)) {
            player.socket.emit("werewolf_list", werewolfList.map(p => p.name));
        }
    }
}

async function handleNight(session: Session) {
    for (const player of session.players) {
        player.currentSelection = null;
    }
    for (const player of session.players) {
        player.socket.emit("start_night", session.round);
    }
    await sleep(2000);
    for (const player of session.players) {
        if (player.role === werewolfRole && player.isAlive) {
            player.socket.emit("start_werewolf_vote");
        }
        if (player.role === seerRole && player.isAlive) {
            player.socket.emit("start_seeing");
        }
    }

    const timeoutMilliseconds: number = 20000;
    session.broadcast("timer", {name: "night-timer", time: timeoutMilliseconds});
    await sleep(timeoutMilliseconds);
    concludeVoting(session);
    await proceedUnlessEnded(session, () => handleDay(session));
}

async function handleDay(session: Session) {
    session.round++;
    for (const player of session.players) {
        player.socket.emit("start_day", session.round);
        if (player.isAlive) {
            player.socket.emit("start_day_vote");
        }
    }
    const timeoutMilliseconds: number = 40000;
    session.broadcast("timer", {name: "day-timer", time: timeoutMilliseconds});
    await sleep(timeoutMilliseconds);
    concludeVoting(session);
    await proceedUnlessEnded(session, () => handleNight(session));
}

function concludeVoting(session: Session) {
    let mostVotedPlayer: Player;
    let mostVotes: number = 0;
    let tie: boolean = true;
    for (const player of session.players) {
        if (player.votes > mostVotes) {
            mostVotedPlayer = player;
            mostVotes = player.votes;
            tie = false;
        } else if (player.votes == mostVotes && player.votes > 0) {
            tie = true;
        }
        player.votes = 0;
    }

    if (!mostVotedPlayer || tie) {
        session.broadcast("no_death");
        return;
    }

    mostVotedPlayer.isAlive = false;
    mostVotedPlayer.socket.emit("you_died");
    session.broadcast("death", mostVotedPlayer.name);
}

async function proceedUnlessEnded(session: Session, func: Function) {
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

    const werewolfList: string[] = [];
    for (const player of session.players) {
        if (player.role === werewolfRole) {
            werewolfList.push(player.name);
        }
    }

    if (numberOfWerewolvesAlive === 0) {
        session.broadcast("village_won", werewolfList);
        return;
    }

    if (numberOfWerewolvesAlive > numberOfVillagersAlive) {
        session.broadcast("werewolves_won", werewolfList);
        return;
    }

    await func();
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

server.listen(process.env.PORT || 8080, () => {
    console.log("Server running on port", process.env.PORT || 8080);
});
