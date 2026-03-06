import { spawn, ChildProcess } from "node:child_process";
import type { NgrokStatus } from "./types.js";

export class NgrokProcessManager {
  private process: ChildProcess | null = null;
  private publicUrl: string | null = null;
  private upstream: string | null = null;

  start(upstream: string): Promise<string> {
    if (this.process) {
      throw new Error("ngrok is already running");
    }

    this.upstream = upstream;

    return new Promise((resolve, reject) => {
      const args = ["http", "18080"];
      const env = { ...process.env };

      if (env.NGROK_AUTHTOKEN) {
        args.push("--authtoken", env.NGROK_AUTHTOKEN);
      }

      this.process = spawn("ngrok", args, {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for ngrok public URL"));
      }, 15000);

      // ngrok outputs JSON log lines to stdout
      this.process.stdout?.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            // ngrok v3 JSON log: msg="started tunnel" url=https://...
            if (obj.url && typeof obj.url === "string") {
              this.publicUrl = obj.url;
              clearTimeout(timeout);
              resolve(obj.url);
              return;
            }
          } catch {
            // not JSON, try regex
            const match = line.match(/url=(https?:\/\/[^\s]+)/);
            if (match) {
              this.publicUrl = match[1];
              clearTimeout(timeout);
              resolve(match[1]);
              return;
            }
          }
        }
      });

      this.process.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        // ngrok v3 may write JSON logs to stderr
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.url && typeof obj.url === "string") {
              this.publicUrl = obj.url;
              clearTimeout(timeout);
              resolve(obj.url);
              return;
            }
          } catch {
            const match = line.match(/url=(https?:\/\/[^\s]+)/);
            if (match) {
              this.publicUrl = match[1];
              clearTimeout(timeout);
              resolve(match[1]);
              return;
            }
          }
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeout);
        this.process = null;
        reject(new Error(`Failed to spawn ngrok: ${err.message}`));
      });

      this.process.on("exit", (code) => {
        this.process = null;
        this.publicUrl = null;
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`ngrok exited with code ${code}`));
        }
      });

      // Poll ngrok API as fallback to get the public URL
      this.pollNgrokApi(timeout, resolve, reject);
    });
  }

  private pollNgrokApi(
    timeout: NodeJS.Timeout,
    resolve: (url: string) => void,
    reject: (err: Error) => void
  ) {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = () => {
      if (this.publicUrl) return;
      if (attempts >= maxAttempts) return;
      attempts++;

      fetch("http://localhost:4040/api/tunnels")
        .then((res) => res.json())
        .then((data: unknown) => {
          if (this.publicUrl) return;
          const d = data as { tunnels?: Array<{ public_url?: string }> };
          const tunnel = d.tunnels?.find((t) =>
            t.public_url?.startsWith("https://")
          );
          if (tunnel?.public_url) {
            this.publicUrl = tunnel.public_url;
            clearTimeout(timeout);
            resolve(tunnel.public_url);
          } else {
            setTimeout(poll, 500);
          }
        })
        .catch(() => {
          setTimeout(poll, 500);
        });
    };

    setTimeout(poll, 1000);
  }

  stop(): void {
    if (!this.process) return;
    this.process.kill("SIGTERM");
    this.process = null;
    this.publicUrl = null;
    this.upstream = null;
  }

  getStatus(): NgrokStatus {
    return {
      running: this.process !== null,
      publicUrl: this.publicUrl,
      upstream: this.upstream,
    };
  }
}
