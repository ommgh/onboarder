// Usage: node scripts/ondc-mock-bap.mjs /tmp/callbacks.jsonl   (listens on :4555)
// Mock ONDC buyer app: records every callback it receives, ACKs synchronously.

import fs from "node:fs";
import http from "node:http";

const out = process.argv[2];
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => {
      fs.appendFileSync(
        out,
        `${JSON.stringify({
          path: req.url,
          auth: req.headers.authorization ?? null,
          body: JSON.parse(body || "{}"),
        })}\n`,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: { ack: { status: "ACK" } } }));
    });
  })
  .listen(4555, () => console.log("mock BAP on 4555"));
