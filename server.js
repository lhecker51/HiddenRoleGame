const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("player connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("player left:", socket.id);
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log("server running on port", process.env.PORT || 8080);
});