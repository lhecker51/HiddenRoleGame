const socket = io();

socket.on("connect", () => {
  console.log("connected to server:", socket.id);
  socket.emit("hello");
});

socket.on("hello_back", (data) => {
  console.log("server says:", data.message);
});