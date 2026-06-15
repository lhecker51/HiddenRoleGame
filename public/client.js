const socket = io();

socket.on("connect", () => {
    console.log("Connected to socket with ID", socket.id);
});

let session_code = "";
let role;

document.getElementById("join-btn").addEventListener("click", () => {
    console.log("Join button clicked.");
    const player_name = document.getElementById("player-name").value.trim();
    session_code = document.getElementById("session-code").value.trim().toUpperCase();

    if (!player_name || !session_code) {
        document.getElementById("status").textContent = "Please enter your name and a session code.";
        return;
    }

    document.getElementById("session-code-p").innerText = "Session code: " + session_code;

    socket.emit("join_session", {player_name, session_code});
});

document.getElementById("start-btn").addEventListener("click", () => {
    console.log("Start button clicked.");
    socket.emit("start_game", {session_code});
});

socket.on("session_update", (players) => {
    console.log("Session update received.");
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";


    const list = document.getElementById("player-list");
    list.innerHTML = players.map(p => `<li>${p.name}</li>`).join("");
});

socket.on("role_update", (received_role) => {
    console.log("Role update received:", received_role);
    role = received_role.toLowerCase();
});

socket.on("error", (data) => {
    console.log("Error received:", data.message);
    document.getElementById("status").textContent = data.message;
});

socket.on("debug", (message) => {
    console.log("Debug received:", message);
});
