const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>it works</h1>");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("server running on port", process.env.PORT || 3000);
});