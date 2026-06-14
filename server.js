const http = require("http");

const PORT = process.env.PORT || 3000;
console.log("PORT env variable is:", process.env.PORT);
console.log("listening on:", PORT);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>it works</h1>");
});

server.listen(PORT);