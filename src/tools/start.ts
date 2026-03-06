import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProxyServer } from "../proxy/server.js";
import type { NgrokProcessManager } from "../ngrok/process.js";

export function registerStartTool(
  server: McpServer,
  proxy: ProxyServer,
  ngrok: NgrokProcessManager
) {
  server.tool(
    "ngrok_start",
    "Start the proxy server and ngrok tunnel. Returns the public URL.",
    { upstream: z.string().describe('Upstream URL (e.g. "http://localhost:3000")') },
    async ({ upstream }) => {
      if (proxy.isRunning()) {
        return {
          content: [{ type: "text", text: "Already running. Call ngrok_stop first." }],
          isError: true,
        };
      }

      await proxy.start(upstream);
      const publicUrl = await ngrok.start(upstream);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ publicUrl, upstream, proxyPort: 18080 }),
          },
        ],
      };
    }
  );
}
