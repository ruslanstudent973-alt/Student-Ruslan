import http from "node:http";
import { Duplex } from "node:stream";
import type { Express } from "express";
import type { NextRequest } from "next/server";

/**
 * Dispatches a Next.js App Router Web Request through an existing Express 4 app
 * and converts the output cleanly into a Web Standard Response.
 * Supports JSON, binary buffers (media streaming), redirects, CORS headers, and query strings.
 */
export async function runExpressHandler(
  expressApp: Express,
  request: NextRequest
): Promise<Response> {
  const url = new URL(request.url);
  const pathWithQuery = `${url.pathname}${url.search}`;
  const method = request.method.toUpperCase();

  let bodyBuffer: Buffer | null = null;
  if (method !== "GET" && method !== "HEAD") {
    const ab = await request.arrayBuffer();
    if (ab.byteLength > 0) {
      bodyBuffer = Buffer.from(ab);
    }
  }

  const headersObj: http.IncomingHttpHeaders = {};
  request.headers.forEach((value, key) => {
    headersObj[key.toLowerCase()] = value;
  });
  if (bodyBuffer && !headersObj["content-length"]) {
    headersObj["content-length"] = String(bodyBuffer.byteLength);
  }

  const mockSocket = new Duplex({
    read() {},
    write(_chunk, _encoding, callback) {
      callback();
    },
  }) as any;

  mockSocket.remoteAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  mockSocket.encrypted = url.protocol === "https:";
  mockSocket.setTimeout = () => mockSocket;
  mockSocket.setNoDelay = () => mockSocket;
  mockSocket.setKeepAlive = () => mockSocket;

  const mockReq = new http.IncomingMessage(mockSocket);
  mockReq.method = method;
  mockReq.url = pathWithQuery;
  (mockReq as any).originalUrl = pathWithQuery;
  mockReq.headers = headersObj;
  mockReq.httpVersion = "1.1";
  mockReq.httpVersionMajor = 1;
  mockReq.httpVersionMinor = 1;

  if (bodyBuffer && bodyBuffer.length > 0) {
    mockReq.push(bodyBuffer);
  }
  mockReq.push(null);

  return new Promise<Response>((resolve, reject) => {
    const mockRes = new http.ServerResponse(mockReq);
    const chunks: Buffer[] = [];
    let settled = false;

    const finalize = () => {
      if (settled) return;
      settled = true;

      const responseHeaders = new Headers();
      const rawHeaders = mockRes.getHeaders();
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            responseHeaders.append(key, String(item));
          }
        } else {
          responseHeaders.set(key, String(value));
        }
      }

      const status = mockRes.statusCode || 200;
      const body =
        method === "HEAD" || status === 204 || status === 304
          ? null
          : new Uint8Array(Buffer.concat(chunks));

      resolve(
        new Response(body, {
          status,
          statusText: mockRes.statusMessage || undefined,
          headers: responseHeaders,
        })
      );
    };

    mockRes.writeHead = function writeHead(
      statusCode: number,
      reasonOrHeaders?: any,
      maybeHeaders?: any
    ) {
      this.statusCode = statusCode;
      let hdrs = maybeHeaders;
      if (typeof reasonOrHeaders === "string") {
        this.statusMessage = reasonOrHeaders;
      } else if (reasonOrHeaders && typeof reasonOrHeaders === "object") {
        hdrs = reasonOrHeaders;
      }
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          if (v !== undefined) {
            this.setHeader(k, v as any);
          }
        }
      }
      (this as any)._header = `HTTP/1.1 ${statusCode}\r\n`;
      return this;
    } as any;

    mockRes.write = function write(
      chunk: any,
      encodingOrCb?: any,
      maybeCb?: any
    ): boolean {
      if (chunk !== undefined && chunk !== null) {
        const encoding =
          typeof encodingOrCb === "string"
            ? (encodingOrCb as BufferEncoding)
            : "utf8";
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
        );
      }
      if (!(this as any)._header) {
        (this as any)._header = `HTTP/1.1 ${this.statusCode || 200}\r\n`;
      }
      const cb = typeof encodingOrCb === "function" ? encodingOrCb : maybeCb;
      if (typeof cb === "function") cb();
      return true;
    } as any;

    let ended = false;
    Object.defineProperty(mockRes, "writableEnded", {
      configurable: true,
      get: () => ended,
    });
    Object.defineProperty(mockRes, "finished", {
      configurable: true,
      get: () => ended,
    });

    mockRes.end = function end(
      chunk?: any,
      encodingOrCb?: any,
      maybeCb?: any
    ) {
      if (ended) return this;
      ended = true;
      if (chunk !== undefined && chunk !== null && typeof chunk !== "function") {
        const encoding =
          typeof encodingOrCb === "string"
            ? (encodingOrCb as BufferEncoding)
            : "utf8";
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
        );
      }
      if (!(this as any)._header) {
        (this as any)._header = `HTTP/1.1 ${this.statusCode || 200}\r\n`;
      }
      this.emit("finish");
      const cb =
        typeof chunk === "function"
          ? chunk
          : typeof encodingOrCb === "function"
          ? encodingOrCb
          : maybeCb;
      if (typeof cb === "function") cb();
      finalize();
      return this;
    } as any;

    try {
      expressApp(mockReq as any, mockRes as any, (err?: any) => {
        if (err) {
          if (!settled) reject(err);
          return;
        }
        if (!settled) {
          mockRes.statusCode = 404;
          mockRes.setHeader("Content-Type", "application/json");
          mockRes.end(JSON.stringify({ error: "API route not found" }));
        }
      });
    } catch (err) {
      if (!settled) reject(err);
    }
  });
}
