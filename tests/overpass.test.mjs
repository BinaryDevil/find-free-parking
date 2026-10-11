import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { requestOverpass } from "../scripts/overpass.ts";

let server;
let endpoint;
before(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let body = "";
    for await (const chunk of req) body += chunk;
    const query = req.method === "POST" ? body : url.searchParams.get("data");
    if (url.pathname === "/error") {
      res.writeHead(429);
      res.end("Too many requests");
    } else if (url.pathname === "/text") {
      res.end("Element count: 4");
    } else if (url.pathname === "/disconnect") {
      req.socket.destroy();
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ query, method: req.method, contentType: req.headers["content-type"], elements: [{ type: "way", id: 7 }] }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("GET delivers an intact Overpass query and returns parsed JSON", async () => {
  const query = '[out:json][timeout:180];\nway["name"="A&B + café"]; out geom;';
  const response = await requestOverpass(query, "GET", endpoint);
  assert.equal(response.status, 200);
  assert.equal(response.data.query, query);
  assert.equal(response.data.method, "GET");
  assert.deepEqual(response.data.elements, [{ type: "way", id: 7 }]);
});

test("POST delivers a plain-text query and retains non-JSON responses", async () => {
  const query = '[out:json][timeout:60]; out count;';
  const response = await requestOverpass(query, "POST", endpoint);
  assert.equal(response.data.query, query);
  assert.equal(response.data.method, "POST");
  assert.equal(response.data.contentType, "text/plain");
  const text = await requestOverpass(query, "POST", `${endpoint}/text`);
  assert.equal(text.data, "Element count: 4");
});

test("HTTP failures reject with status and the diagnostic response body", async () => {
  await assert.rejects(requestOverpass("out count;", "GET", `${endpoint}/error`), (error) => {
    assert.match(error.message, /429/);
    assert.equal(error.response.status, 429);
    assert.equal(error.response.data, "Too many requests");
    return true;
  });
});

test("transport failures reject rather than returning empty successful data", async () => {
  await assert.rejects(requestOverpass("out count;", "GET", `${endpoint}/disconnect`), /fetch failed/);
});
