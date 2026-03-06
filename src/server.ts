import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProxyServer } from "./proxy/server.js";
import { NgrokProcessManager } from "./ngrok/process.js";
import { registerStartTool } from "./tools/start.js";
import { registerStopTool } from "./tools/stop.js";
import { registerStatusTool } from "./tools/status.js";

export function createServer() {
  const server = new McpServer({
    name: "mcp-ngrok",
    version: "1.0.0",
  });

  const proxy = new ProxyServer();
  const ngrok = new NgrokProcessManager();

  registerStartTool(server, proxy, ngrok);
  registerStopTool(server, proxy, ngrok);
  registerStatusTool(server, ngrok);

  // Cleanup on process exit
  const cleanup = () => {
    ngrok.stop();
    proxy.stop().catch(() => {});
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  return server;
}
