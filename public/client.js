const socket = io("");

socket.on("connect", () => {
    console.log("Connected to socket with ID", socket.id);
});

let session_code = "";
const players = [];
const werewolves = [];
let role;


//lobby and join
document.getElementById("join-btn").addEventListener("click", () => {
    console.log("Join button clicked.");
    const player_name = document.getElementById("player-name").value.trim();
    session_code = document.getElementById("session-code").value.trim().toUpperCase();

    if (!player_name || !session_code) {
        document.getElementById("status").textContent = "Please enter your name and a session code.";
        return;
    }

    socket.emit("join_session", {player_name, session_code});
});

socket.on("join_success", () => {
    console.log("Joined successfully!");
    document.getElementById("session-code-p").innerText = "Session code: " + session_code;
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
});

socket.on("player_joined", (player_name) => {
    console.log("Player joined.");
    players.push(player_name);
    update_player_list();
});

socket.on("player_left", (player_name) => {
    console.log("Player left.");
    const index = players.indexOf(player_name);
    if (index > -1) {
        players.splice(index, 1);
    }
    update_player_list();
});

function update_player_list() {
    const list = document.getElementById("player-list");
    list.innerHTML = players.map(name => `<li>${name}</li>`).join("");
}

document.getElementById("start-btn").addEventListener("click", () => {
    console.log("Start button clicked.");
    socket.emit("start_game");
});

socket.on("start_success", () => {
    console.log("Game start successful!");
})

socket.on("timer", (timeMilliseconds) => {
    console.log(`Timer started for ${timeMilliseconds / 1000} seconds.`)
});

socket.on("role_update", (received_role) => {
    role = received_role;
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("role-name").innerHTML = role;
    console.log("Role update received:", received_role);
    document.getElementById("role-screen").classList.remove("hidden");
});

socket.on("werewolf_list", (werewolf_list) => {
    document.getElementById("werewolf-team").classList.remove("hidden");
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
        update_werewolf_list();
    }
    console.log("Werewolves are:", werewolves);
});

function update_werewolf_list() {
    const list = document.getElementById("werewolf-team-list");
    list.innerHTML = werewolves.map(werewolf => `<li>${werewolf}</li>`).join("");
}

socket.on("start_night", (number) => {
    console.log("It is night", number);
    document.getElementById("role-screen").classList.add("hidden");
    if (role == "Villager") {
        document.getElementById("night-villager-screen").classList.remove("hidden");
        console.log("villager screen worked");
    } else if (role == "Werewolf") {
        document.getElementById("night-werewolf-screen").classList.remove("hidden");
        console.log("werewolf screen worked");
    }
});


socket.on("start_werewolf_vote", () => {
    console.log("Werewolf vote started...");
});

socket.on("selected_werewolf", (victim) => {
    console.log(victim, "was selected for killing...");
});

socket.on("you_died", () => {
    console.log("You died :(");
});

socket.on("death", (player_name) => {
    console.log(player_name, "has died!");
    const player_index = players.indexOf(player_name);
    if (player_index > -1) {
        players.splice(player_index, 1);
    }
    const werewolf_index = werewolves.indexOf(player_name);
    if (werewolf_index > -1) {
        players.splice(werewolf_index, 1);
    }
});

socket.on("start_day", (number) => {
    console.log("It is day", number);
    document.getElementByID("day-screen").classList.remove("Hidden");
});

socket.on("start_day_vote", () => {
    console.log("Day vote started!");
});

socket.on("village_won", () => {
    console.log("The villagers won the game!");
});

socket.on("werewolves_won", () => {
    console.log("The werewolves won the game!");
});

socket.on("error", (data) => {
    console.log("Error received:", data.message);
    document.getElementById("status").textContent = data.message;
});

socket.on("debug", (message) => {
    console.log("Debug received:", message);
});
