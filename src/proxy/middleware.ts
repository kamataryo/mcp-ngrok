import type { IncomingMessage, ServerResponse } from "node:http";

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => void;

export function createMiddlewareChain(middlewares: Middleware[]) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    let index = 0;

    const next = () => {
      const mw = middlewares[index++];
      if (mw) {
        mw(req, res, next);
      }
    };

    next();
  };
}
