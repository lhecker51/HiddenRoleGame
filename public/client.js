const socket = io("");

socket.on("connect", () => {
    console.log("Connected to socket with ID", socket.id);
});

let session_code = "";
const players = [];
const werewolves = [];
let role;

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
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
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
    socket.emit("start_game", session_code);
});

socket.on("start_successful", () => {
    console.log("Game start successful!");
    // todo lisa: hier äh dings reinmachen
    document.getElementById("role-screen").style.display = "block";
})

socket.on("role_update", (received_role) => {
    role = received_role;
    document.getElementById("role-name").innerHTML = role;
    console.log("Role update received:", received_role);
});

socket.on("werewolf_list", (werewolf_list) => {
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
    }
    console.log("Werewolves are:", werewolves);
});

socket.on("day", (number) => {
    console.log("It is day", number);
});

socket.on("error", (data) => {
    console.log("Error received:", data.message);
    document.getElementById("status").textContent = data.message;
});

socket.on("debug", (message) => {
    console.log("Debug received:", message);
});
