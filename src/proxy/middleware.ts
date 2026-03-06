import type { IncomingMessage, ServerResponse } from "node:http";

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => void | Promise<void>;

export function createMiddlewareChain(middlewares: Middleware[]) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    let index = 0;

    const next = () => {
      const mw = middlewares[index++];
      if (mw) {
        Promise.resolve(mw(req, res, next)).catch((err) => {
          if (!res.headersSent) {
            res.writeHead(500);
            res.end(`Internal Server Error: ${err.message}`);
          }
        });
      }
    };

    next();
  };
}
