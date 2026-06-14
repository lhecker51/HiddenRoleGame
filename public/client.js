const socket = io();

socket.on("connect", () => {
  console.log("connected:", socket.id);
});

document.getElementById("join-btn").addEventListener("click", () => {
  const name = document.getElementById("player-name").value.trim();
  const code = document.getElementById("room-code").value.trim().toUpperCase();

  if (!name || !code) {
    document.getElementById("status").textContent = "Please enter your name and a session code.";
    return;
  }

  socket.emit("join_room", { name, code });
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