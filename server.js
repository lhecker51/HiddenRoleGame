const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const players = {};

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2);
  players[id] = { ws, role: null };

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      // assign role, send back to client
      players[id].role = assignRole();
      ws.send(JSON.stringify({ type: 'role', role: players[id].role }));
    }

    if (data.type === 'action') {
      // broadcast to all other players
      broadcast(id, { type: 'action', from: id, payload: data.payload });
    }
  });

  ws.on('close', () => {
    delete players[id];
  });
});

function broadcast(senderId, message) {
  Object.entries(players).forEach(([id, player]) => {
    if (id !== senderId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

function assignRole() {
  const roles = ['mafia', 'villager', 'detective'];
  return roles[Math.floor(Math.random() * roles.length)];
}