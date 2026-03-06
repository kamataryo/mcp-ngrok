import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProxyServer } from "../proxy/server.js";
import type { NgrokProcessManager } from "../ngrok/process.js";

export function registerStopTool(
  server: McpServer,
  proxy: ProxyServer,
  ngrok: NgrokProcessManager
) {
  server.tool(
    "ngrok_stop",
    "Stop the ngrok tunnel and proxy server.",
    {},
    async () => {
      ngrok.stop();
      await proxy.stop();

      return {
        content: [{ type: "text", text: "ngrok and proxy stopped." }],
      };
    }
  );
}
