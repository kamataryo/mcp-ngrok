import http, { IncomingMessage, ServerResponse } from "node:http";
import https from "node:https";
import { createMiddlewareChain, type Middleware } from "./middleware.js";
import { createGitignoreMiddleware } from "./gitignore-middleware.js";

export interface ProxyServerOptions {
  gitignoreMiddleware?: boolean;
}

const PROXY_PORT = 18080;

function blockDotGitMiddleware(): Middleware {
  return (req, res, next) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/.git" || pathname.startsWith("/.git/")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    next();
  };
}

function forwardMiddleware(getUpstream: () => string | null): Middleware {
  return (req, res, _next) => {
    const upstream = getUpstream();
    if (!upstream) {
      res.writeHead(503);
      res.end("Proxy upstream not configured");
      return;
    }

    const targetUrl = new URL(req.url ?? "/", upstream);
    const isHttps = targetUrl.protocol === "https:";

    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    };

    const mod = isHttps ? https : http;

    const proxyReq = mod.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      res.writeHead(502);
      res.end(`Bad gateway: ${err.message}`);
    });

    req.pipe(proxyReq);
  };
}

export class ProxyServer {
  private server: http.Server | null = null;
  private upstream: string | null = null;

  start(upstream: string, options: ProxyServerOptions = {}): Promise<void> {
    this.upstream = upstream;

    return new Promise((resolve, reject) => {
      const getUpstream = () => this.upstream;

      const middlewares: Middleware[] = [blockDotGitMiddleware()];
      if (options.gitignoreMiddleware) {
        middlewares.push(createGitignoreMiddleware(getUpstream));
      }
      middlewares.push(forwardMiddleware(getUpstream));

      const handler = createMiddlewareChain(middlewares);

      this.server = http.createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          handler(req, res);
        }
      );

      this.server.on("error", reject);
      this.server.listen(PROXY_PORT, () => resolve());
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.server = null;
        this.upstream = null;
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}
