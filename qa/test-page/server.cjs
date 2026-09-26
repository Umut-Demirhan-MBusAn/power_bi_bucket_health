// Local test page for Bucket Health: runs the packaged visual (newest dist/*.pbiviz) in an iframe
// with a Power BI host double, fed live from SQL Server (BucketHealthQA.dbo.v_bucket_health).
// Needs: `npm run package` first, `sqlcmd` and `unzip` on PATH, qa/bucket_health_qa.sql applied.
// Run:   node qa/test-page/server.cjs     then open http://127.0.0.1:8766/
// Env:   BH_PORT (8766), BH_SQL_SERVER (localhost), BH_SQL_DATABASE (BucketHealthQA)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PORT = Number(process.env.BH_PORT) || 8766;
const SERVER = process.env.BH_SQL_SERVER || "localhost";
const DATABASE = process.env.BH_SQL_DATABASE || "BucketHealthQA";
const HERE = __dirname;
const DIST = path.resolve(HERE, "..", "..", "dist");

let cache = { file: "", mtime: 0, js: "", css: "" };

// The .pbiviz is a zip; its resources/<guid>.pbiviz.json holds the bundled visual.js and CSS.
function loadVisual() {
    const files = fs.readdirSync(DIST).filter((f) => f.endsWith(".pbiviz"))
        .map((f) => ({ f, t: fs.statSync(path.join(DIST, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
    if (!files.length) throw new Error(`no .pbiviz in ${DIST}; run npm run package`);
    const { f, t } = files[0];
    if (cache.file !== f || cache.mtime !== t) {
        const json = execFileSync("unzip", ["-p", path.join(DIST, f), "resources/*.pbiviz.json"], { maxBuffer: 64 << 20 }).toString("utf8");
        const content = JSON.parse(json).content;
        cache = { file: f, mtime: t, js: content.js, css: content.css };
        console.log(`loaded ${f} (${new Date(t).toLocaleTimeString()})`);
    }
    return cache;
}

// sqlcmd pads and wraps long output, so the JSON travels between markers on one value.
const QUERY = `SET NOCOUNT ON;
DECLARE @j nvarchar(max) = (
    SELECT machine_key, machine_type, component_key, component_category, component_order, status,
           alarm_time, last_seen_utc, tag_id, wear_pct
    FROM dbo.v_bucket_health
    ORDER BY machine_key, component_category, component_order
    FOR JSON PATH, INCLUDE_NULL_VALUES);
SELECT CONCAT(N'@@BH@@', ISNULL(@j, N'[]'), N'@@BH@@');`;

function queryRows() {
    const out = execFileSync("sqlcmd", ["-S", SERVER, "-E", "-C", "-d", DATABASE, "-y", "0", "-Q", QUERY],
        { encoding: "utf8", maxBuffer: 64 << 20 });
    const match = /@@BH@@([\s\S]*?)@@BH@@/.exec(out);
    if (!match) throw new Error(`unexpected sqlcmd output: ${out.slice(0, 300)}`);
    return JSON.parse(match[1]);
}

function send(res, status, type, body) {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
}

const PAGES = { "/": "index.html", "/index.html": "index.html", "/frame.html": "frame.html" };

// Only this machine's own origin: a page elsewhere could otherwise rebind its hostname to
// 127.0.0.1 and read the data or trigger sqlcmd runs.
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

http.createServer((req, res) => {
    if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 403, "text/plain", "forbidden host");
    try {
        const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
        if (PAGES[url.pathname]) {
            return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(path.join(HERE, PAGES[url.pathname])));
        }
        if (url.pathname === "/visual.js") return send(res, 200, "text/javascript; charset=utf-8", loadVisual().js);
        if (url.pathname === "/visual.css") return send(res, 200, "text/css; charset=utf-8", loadVisual().css);
        if (url.pathname === "/build") return send(res, 200, "application/json", JSON.stringify({ file: loadVisual().file, mtime: cache.mtime }));
        if (url.pathname === "/data") return send(res, 200, "application/json", JSON.stringify(queryRows()));
        send(res, 404, "text/plain", "not found");
    } catch (e) {
        send(res, 500, "text/plain", String((e && e.stack) || e));
    }
}).listen(PORT, "127.0.0.1", () => console.log(`Bucket Health test page: http://127.0.0.1:${PORT}/  (dist ${DIST}, ${SERVER}/${DATABASE})`));
