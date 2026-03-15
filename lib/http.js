const path = require("path");

const API_NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate";
const HTML_NO_CACHE = "no-cache";

function sendHtml(res, filePath) {
  res.setHeader("Cache-Control", HTML_NO_CACHE);
  res.sendFile(filePath);
}

const staticOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") {
      res.setHeader("Cache-Control", HTML_NO_CACHE);
      return;
    }
    if (filePath.includes(`${path.sep}uploads${path.sep}`)) {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
      return;
    }
    if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"].includes(ext)) {
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      return;
    }
    if ([".css", ".js"].includes(ext)) {
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  }
};

module.exports = {
  API_NO_STORE,
  HTML_NO_CACHE,
  sendHtml,
  staticOptions
};
