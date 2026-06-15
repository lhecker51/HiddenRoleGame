const socket = io();

socket.on("connect", () => {
  console.log("connected:", socket.id);
});

let session_code = "";

document.getElementById("join-btn").addEventListener("click", () => {
  const player_name = document.getElementById("player-name").value.trim();
  session_code = document.getElementById("session-code").value.trim().toUpperCase();

  if (!player_name || !session_code) {
    document.getElementById("status").textContent = "Please enter your name and a session code.";
    return;
  }

  document.getElementById("session-code-p").innerText = "Session code: " + session_code;

  socket.emit("join_session", { player_name, session_code });
});

document.getElementById("start-btn").addEventListener("click", () => {
  socket.emit("start_game", {session_code});
});

socket.on("session_update", (data) => {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";


  const list = document.getElementById("player-list");
  list.innerHTML = data.players.map(p => `<li>${p.name}</li>`).join("");
});

socket.on("error", (data) => {
  document.getElementById("status").textContent = data.message;
});
