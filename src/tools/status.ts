import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NgrokProcessManager } from "../ngrok/process.js";

export function registerStatusTool(
  server: McpServer,
  ngrok: NgrokProcessManager
) {
  server.tool(
    "ngrok_status",
    "Get the current status of the ngrok tunnel and proxy server.",
    {},
    async () => {
      const status = ngrok.getStatus();

      return {
        content: [{ type: "text", text: JSON.stringify(status) }],
      };
    }
  );
}
