import http from "node:http";
import https from "node:https";
import ignore, { type Ignore } from "ignore";
import type { Middleware } from "./middleware.js";

function fetchGitignore(upstream: string): Promise<Ignore> {
  return new Promise((resolve) => {
    const url = new URL("/.gitignore", upstream).toString();
    const mod = url.startsWith("https:") ? https : http;

    const req = mod.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(
          // @ts-ignore
          ignore()
        );
        return;
      }

      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => { resolve(
        // @ts-ignore
        ignore()
          .add(body)
      ); });
    });

    req.on("error", () => { resolve(
      // @ts-ignore
      ignore());
    });
  });
}

export function createGitignoreMiddleware(getUpstream: () => string | null): Middleware {
  let cache: Ignore | null = null;

  return async (req, res, next) => {
    const upstream = getUpstream();
    if (!upstream) { next(); return; }

    if (!cache) {
      cache = await fetchGitignore(upstream);
    }

    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const relativePath = pathname.replace(/^\//, "");

    if (relativePath && cache.ignores(relativePath)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    next();
  };
}
