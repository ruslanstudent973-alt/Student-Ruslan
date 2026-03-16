import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { initialData } from "./src/data/db";

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log(`[Server] Loading server.ts (VERCEL: ${!!process.env.VERCEL}, NODE_ENV: ${process.env.NODE_ENV})`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data store
let cachedData: any = { ...initialData };

// Ensure data has all required fields
if (!cachedData.promoCodes) cachedData.promoCodes = [];
if (!cachedData.partnerships) cachedData.partnerships = [];
if (!cachedData.wishlists) cachedData.wishlists = {};
if (!cachedData.supportMessages) cachedData.supportMessages = [];

console.log(`[Server] Starting initialization...`);
export const app = express();
console.log(`[Server] Express app created`);

// Health check
app.get("/ping", (req, res) => res.send("pong"));
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api')) {
      console.log(`[Server] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API: Sync data (In-memory only now)
app.post("/api/sync", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.products) {
      return res.status(400).json({ error: "Noto'g'ri ma'lumotlar formati" });
    }
    
    cachedData = { ...data };
    console.log(`[Server] Data updated in memory`);
    res.json({ success: true, message: "Ma'lumotlar xotiraga muvaffaqiyatli saqlandi." });
  } catch (e: any) {
    console.error('[Server] Sync error:', e);
    res.status(500).json({ error: e.message });
  }
});

// API: Get all data
app.get("/api/data", async (req, res) => {
    console.log('[Server] GET /api/data');
    res.json(cachedData);
});

// API: Get DB Status
app.get("/api/db-status", async (req, res) => {
  console.log('[Server] GET /api/db-status');
  res.json({ 
    connected: true,
    usingMongo: false,
    productCount: cachedData.products?.length || 0,
    status: "In-Memory Mode (No MongoDB)"
  });
});

// API: Debug DB (Legacy fallback)
app.get("/api/debug-db", async (req, res) => {
  res.json({ 
    status: "Connected", 
    counts: {
      products: cachedData.products?.length || 0,
      users: cachedData.users?.length || 0,
      orders: cachedData.orders?.length || 0,
      banners: cachedData.banners?.length || 0
    },
    uri_prefix: "in-memory"
  });
});

// API: Export data
app.get("/api/export", async (req, res) => {
  res.json({
    products: cachedData.products,
    banners: cachedData.banners
  });
});

// API: Partnership request
app.post("/api/partnerships", async (req, res) => {
  const newRequest = { ...req.body, id: `PART-${Date.now()}`, status: 'pending', date: new Date().toISOString() };
  cachedData.partnerships.push(newRequest);
  res.json({ success: true, request: newRequest });
});

// API: Update partnership (Admin only)
app.post("/api/partnerships/update", async (req, res) => {
  const { id, status } = req.body;
  const index = cachedData.partnerships.findIndex((p: any) => p.id === id);
  if (index > -1) {
    cachedData.partnerships[index].status = status;
    
    if (status === 'approved') {
      const userId = cachedData.partnerships[index].userId;
      const type = cachedData.partnerships[index].type;
      const discount = type === '40' ? 0.4 : 0.55;
      
      for (let i = 0; i < 50; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        cachedData.promoCodes.push({
          id: `PROMO-${Date.now()}-${i}`,
          code,
          discount,
          ownerId: userId,
          isUsed: false,
          usedBy: null
        });
      }
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Request not found" });
  }
});

// API: Wishlist toggle
app.post("/api/wishlist/toggle", async (req, res) => {
  const { userId, productId } = req.body;
  if (!cachedData.wishlists[userId]) cachedData.wishlists[userId] = [];
  
  const index = cachedData.wishlists[userId].indexOf(productId);
  if (index > -1) {
    cachedData.wishlists[userId].splice(index, 1);
  } else {
    cachedData.wishlists[userId].push(productId);
  }
  res.json({ success: true, wishlist: cachedData.wishlists[userId] });
});

// API: Support messages
app.post("/api/support", async (req, res) => {
  const newMessage = { ...req.body, id: `MSG-${Date.now()}`, date: new Date().toISOString() };
  cachedData.supportMessages.push(newMessage);
  res.json({ success: true });
});

// API: Update products (Admin only)
app.post("/api/products", async (req, res) => {
  const newProduct = req.body;
  const existingIndex = cachedData.products.findIndex((p: any) => p.id === newProduct.id);
  if (existingIndex > -1) {
    cachedData.products[existingIndex] = newProduct;
  } else {
    cachedData.products.push(newProduct);
  }
  res.json({ success: true });
});

// API: Delete product (Admin only)
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  cachedData.products = cachedData.products.filter((p: any) => p.id !== id);
  res.json({ success: true });
});

// API: Update banners (Admin only)
app.post("/api/banners", async (req, res) => {
  cachedData.banners = req.body;
  res.json({ success: true });
});

// API: Register/Update user
app.post("/api/users", async (req, res) => {
  console.log('[Server] POST /api/users', JSON.stringify(req.body));
  try {
    const newUser = req.body;
    if (!newUser || !newUser.phoneNumber) {
      console.error('[Server] Invalid user data:', newUser);
      return res.status(400).json({ 
        error: "Foydalanuvchi ma'lumotlari noto'g'ri",
        details: "phoneNumber majburiy" 
      });
    }
    
    if (!cachedData.users) {
      console.log('[Server] Initializing users array');
      cachedData.users = [];
    }
    
    const existingIndex = cachedData.users.findIndex((u: any) => u.phoneNumber === newUser.phoneNumber);
    if (existingIndex > -1) {
      cachedData.users[existingIndex] = { ...cachedData.users[existingIndex], ...newUser };
      console.log('[Server] User updated:', newUser.phoneNumber);
    } else {
      cachedData.users.push(newUser);
      console.log('[Server] New user registered:', newUser.phoneNumber);
    }
    res.json({ success: true, user: newUser });
  } catch (e: any) {
    console.error('[Server] Error in /api/users:', e);
    res.status(500).json({ 
      error: 'Serverda xatolik yuz berdi', 
      message: e.message 
    });
  }
});

// API: Use promo code
app.post("/api/promo/use", async (req, res) => {
  const { code } = req.body;
  const promoIndex = cachedData.promoCodes.findIndex((p: any) => p.code.toUpperCase() === code.toUpperCase());
  if (promoIndex > -1) {
    const promo = cachedData.promoCodes[promoIndex];
    cachedData.promoCodes[promoIndex].isUsed = true;
    
    const ownerIndex = cachedData.users.findIndex((u: any) => u.telegramId === promo.ownerId);
    if (ownerIndex > -1) {
      cachedData.users[ownerIndex].referralBalance = (cachedData.users[ownerIndex].referralBalance || 0) + 20000;
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Promo code not found" });
  }
});

// API: Create order
app.post("/api/orders", async (req, res) => {
  const newOrder = { ...req.body, id: `ORD-${Date.now()}` };
  cachedData.orders.push(newOrder);
  res.json({ success: true, order: newOrder });
});

// API: Update order (Status and Track Number)
app.post("/api/orders/update", async (req, res) => {
  const { id, status, trackNumber } = req.body;
  const orderIndex = cachedData.orders.findIndex((o: any) => o.id === id);
  if (orderIndex > -1) {
    cachedData.orders[orderIndex] = { ...cachedData.orders[orderIndex], status, trackNumber };
    res.json({ success: true, order: cachedData.orders[orderIndex] });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// API: Delete order
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  cachedData.orders = cachedData.orders.filter((o: any) => o.id !== id);
  res.json({ success: true });
});

// API: Notify Admin via Telegram
app.post("/api/notify", async (req, res) => {
  const { message, chatId } = req.body;
  const token = process.env.TELEGRAM_TOKEN || '8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc';
  const targetChatId = chatId || '8215056224';
  
  console.log(`[Server] Sending Telegram notification to ${targetChatId}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'Markdown' }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    console.log(`[Server] Telegram response:`, data.ok ? 'OK' : 'Error');
    res.json(data);
  } catch (e: any) {
    console.error('[Server] Telegram notification error:', e.message);
    res.status(500).json({ error: "Failed to send notification", details: e.message });
  }
});

// API: Add referral bonus
app.post("/api/referral/add", async (req, res) => {
  const { referrerId, amount } = req.body;
  const userIndex = cachedData.users.findIndex((u: any) => u.telegramId === referrerId || u.phoneNumber === referrerId);
  if (userIndex > -1) {
    cachedData.users[userIndex].referralBalance = (cachedData.users[userIndex].referralBalance || 0) + amount;
    cachedData.users[userIndex].invitedCount = (cachedData.users[userIndex].invitedCount || 0) + 1;
    res.json({ success: true, user: cachedData.users[userIndex] });
  } else {
    res.status(404).json({ error: "Referrer not found" });
  }
});

// API: Add review to product
app.post("/api/products/:id/reviews", async (req, res) => {
  const { id } = req.params;
  const review = { ...req.body, id: `REV-${Date.now()}`, date: new Date().toISOString().split('T')[0] };
  
  const productIndex = cachedData.products.findIndex((p: any) => p.id === id);
  if (productIndex > -1) {
    if (!cachedData.products[productIndex].reviews) {
      cachedData.products[productIndex].reviews = [];
    }
    cachedData.products[productIndex].reviews.unshift(review);
    
    const reviews = cachedData.products[productIndex].reviews;
    const avgRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length;
    cachedData.products[productIndex].rating = Number(avgRating.toFixed(1));
    
    res.json({ success: true, review });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// 404 Handler for API (Must be before SPA fallback)
app.use('/api', (req, res) => {
  console.warn(`[Server] 404 API Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: `API yo'nalishi topilmadi: ${req.method} ${req.originalUrl || req.url}`,
    path: req.path,
    url: req.url
  });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Express Error:', err);
  if (req.url.startsWith('/api')) {
    return res.status(500).json({ 
      error: 'Serverda ichki xatolik yuz berdi',
      message: err.message 
    });
  }
  next(err);
});

// Start server
if (!process.env.VERCEL) {
  const PORT = 3000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
  });
  // Increase timeouts for stability
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('[Server] Process terminated');
    });
  });
} else {
  console.log(`[Server] Running in Vercel environment, skipping app.listen()`);
}

// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    console.log('[Server] Initializing Vite middleware...');
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware initialized');
  } catch (e) {
    console.error('[Server] Failed to initialize Vite middleware:', e);
  }
} else {
  console.log(`[Server] Production mode or Vercel, serving static files from dist`);
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    // For API routes that aren't found, we already have a 404 handler above
    // This is for SPA routing
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;
