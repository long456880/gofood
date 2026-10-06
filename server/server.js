// Standalone Node host for GoFood's API routes (used on Render).
// The app is native, so only the API routes in ./build are served.
const http = require("node:http");
const path = require("node:path");
const { createRequestHandler } = require("expo-server/adapter/http");

const handler = createRequestHandler({ build: path.join(__dirname, "build") });
const port = Number(process.env.PORT) || 3000;

http
  .createServer((req, res) => {
    handler(req, res, (err) => {
      console.error("[server] request failed:", err);
      if (!res.headersSent) res.statusCode = 500;
      res.end("Server error");
    });
  })
  .listen(port, () => console.log(`GoFood API listening on ${port}`));
