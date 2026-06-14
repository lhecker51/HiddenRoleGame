const socket = io();

socket.on("connect", () => {
  console.log("connected:", socket.id);
});

let code = "";

document.getElementById("join-btn").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  code = document.getElementById("room-code").value.trim().toUpperCase();

  if (!name || !code) {
    document.getElementById("status").textContent = "Please enter your name and a session code.";
    return;
  }

  document.getElementById("session-code-p").setAttribute("text", code)

  socket.emit("join_room", { name, code });
});

document.getElementById("start-btn").addEventListener("click", () => {
  socket.emit("start_game", {code});
});

socket.on("room_update", (data) => {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";


  const list = document.getElementById("player-list");
  list.innerHTML = data.players.map(p => `<p>${p.name}</p>`).join("");
});

socket.on("error", (data) => {
  document.getElementById("status").textContent = data.message;
});
