import http from "node:http";
import { loadConfig } from "./config.js";
import { generateAction } from "./generate.js";
import { inspectSamples } from "./samples.js";

const config = loadConfig();

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, {
        ok: true,
        model: config.model,
        outputDir: config.outputDir,
        samples: inspectSamples(config.samplesDir)
      });
      return;
    }

    if (req.method === "POST" && req.url === "/generate") {
      const body = await readBody(req);
      let payload;
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        payload = { prompt: body };
      }
      const result = await generateAction(payload.prompt, config, { mode: payload.mode });
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "Not Found",
      endpoints: ["GET /health", "POST /generate"]
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Quicker action generator listening on http://${config.host}:${config.port}`);
  console.log(`Output dir: ${config.outputDir}`);
});
