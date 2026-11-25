import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

const DEFAULT_DB_NAME = "saytim";

interface MongoGlobalCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __yuyuMongoCache: MongoGlobalCache | undefined;
}

const globalCache: MongoGlobalCache =
  globalThis.__yuyuMongoCache ??
  (globalThis.__yuyuMongoCache = { client: null, promise: null });

export function getMongoUri(): string {
  return (process.env.MONGODB_URI || "").trim();
}

export function getMongoDbName(): string {
  return (process.env.MONGODB_DB || DEFAULT_DB_NAME).trim() || DEFAULT_DB_NAME;
}

export function isMongoConfigured(): boolean {
  const uri = getMongoUri();
  return /^mongodb(\+srv)?:\/\//.test(uri);
}

/**
 * Returns a cached MongoClient singleton safe for Next.js dev HMR
 * and Vercel Serverless Function warm container reuse.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri();
  if (!isMongoConfigured()) {
    throw new Error(
      "MONGODB_URI muhit o'zgaruvchisi sozlanmagan. Vercel Environment Variables yoki .env faylga qo'shing."
    );
  }

  if (globalCache.client) {
    return globalCache.client;
  }

  if (!globalCache.promise) {
    const options: MongoClientOptions = {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    const client = new MongoClient(uri, options);
    globalCache.promise = client
      .connect()
      .then((connected) => {
        globalCache.client = connected;
        return connected;
      })
      .catch((err) => {
        globalCache.promise = null;
        globalCache.client = null;
        throw err;
      });
  }

  return globalCache.promise;
}

/**
 * Returns the configured MongoDB Db instance (defaults to `saytim`).
 */
export async function getDb(dbName?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName || getMongoDbName());
}

/**
 * Runs a lightweight ping against MongoDB Atlas to verify connectivity.
 */
export async function checkMongoHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  database: string;
  latencyMs?: number;
  error?: string;
}> {
  const database = getMongoDbName();
  if (!isMongoConfigured()) {
    return {
      connected: false,
      configured: false,
      database,
      error: "MONGODB_URI is not configured",
    };
  }

  const startedAt = Date.now();
  try {
    const db = await getDb(database);
    await db.command({ ping: 1 });
    return {
      connected: true,
      configured: true,
      database,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      database,
      latencyMs: Date.now() - startedAt,
      error: err?.message || "MongoDB connection failed",
    };
  }
}
