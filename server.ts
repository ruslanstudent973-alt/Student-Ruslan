import dotenv from "dotenv";
const existingEnvUri = (process.env.MONGODB_URI || "").trim();
dotenv.config({
  override: !existingEnvUri || !/^mongodb(\+srv)?:\/\//.test(existingEnvUri)
});
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./api/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Parse port and host from CLI args, environment variables, or defaults
const args = process.argv.slice(2);
let port = 3000;
const portArgIndex = args.indexOf('--port');
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  port = parseInt(args[portArgIndex + 1], 10);
} else if (process.env.PORT) {
  port = parseInt(process.env.PORT, 10);
}

let host = '0.0.0.0';
const hostArgIndex = args.indexOf('--host');
if (hostArgIndex !== -1 && args[hostArgIndex + 1]) {
  host = args[hostArgIndex + 1];
}

async function startServer() {
  if (process.env.VERCEL) {
    return;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite middleware mounted');
    } catch (e) {
      console.error('[Server] Failed to initialize Vite middleware:', e);
    }
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.url.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(port, host, () => {
    console.log(`[Server] Server running on http://${host}:${port}`);
  });
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer();

export { app };
export default app;
