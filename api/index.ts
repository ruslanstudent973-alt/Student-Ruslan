import express from "express";
import cors from "cors";
import { initialData } from "./data.ts";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store
let cachedData = { ...initialData };

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

router.get("/data", (req, res) => {
  res.json(cachedData);
});

router.post("/users", (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.phoneNumber) {
    return res.status(400).json({ error: "phoneNumber required" });
  }
  if (!cachedData.users) cachedData.users = [];
  const existingIndex = cachedData.users.findIndex((u: any) => u.phoneNumber === newUser.phoneNumber);
  if (existingIndex > -1) {
    cachedData.users[existingIndex] = { ...cachedData.users[existingIndex], ...newUser };
  } else {
    cachedData.users.push(newUser);
  }
  res.json({ success: true, user: newUser });
});

router.post("/sync", (req, res) => {
  const data = req.body;
  if (data && data.products) {
    cachedData = { ...data };
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid data" });
  }
});

router.post("/notify", async (req, res) => {
  const { message, chatId } = req.body;
  const token = process.env.TELEGRAM_TOKEN || '8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc';
  const targetChatId = chatId || '8215056224';
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'Markdown' })
    });
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/db-status", (req, res) => {
  res.json({
    connected: true,
    usingMongo: false,
    productCount: (cachedData.products || []).length,
    error: ""
  });
});

router.post("/partnerships", (req, res) => {
  const newRequest = { ...req.body, id: `PART-${Date.now()}`, status: 'pending', date: new Date().toISOString() };
  if (!cachedData.partnerships) cachedData.partnerships = [];
  cachedData.partnerships.push(newRequest);
  res.json({ success: true, request: newRequest });
});

router.post("/partnerships/update", (req, res) => {
  const { id, status } = req.body;
  if (!cachedData.partnerships) cachedData.partnerships = [];
  const index = cachedData.partnerships.findIndex((p: any) => p.id === id);
  if (index > -1) {
    cachedData.partnerships[index].status = status;
    if (status === 'approved') {
      const userId = cachedData.partnerships[index].userId;
      const type = cachedData.partnerships[index].type;
      const discount = type === '40' ? 0.4 : 0.55;
      if (!cachedData.promoCodes) cachedData.promoCodes = [];
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

router.post("/wishlist/toggle", (req, res) => {
  const { userId, productId } = req.body;
  if (!cachedData.wishlists) cachedData.wishlists = {};
  if (!cachedData.wishlists[userId]) cachedData.wishlists[userId] = [];
  const index = cachedData.wishlists[userId].indexOf(productId);
  if (index > -1) {
    cachedData.wishlists[userId].splice(index, 1);
  } else {
    cachedData.wishlists[userId].push(productId);
  }
  res.json({ success: true, wishlist: cachedData.wishlists[userId] });
});

router.post("/support", (req, res) => {
  const newMessage = { ...req.body, id: `MSG-${Date.now()}`, date: new Date().toISOString() };
  if (!cachedData.supportMessages) cachedData.supportMessages = [];
  cachedData.supportMessages.push(newMessage);
  res.json({ success: true });
});

router.post("/products", (req, res) => {
  const newProduct = req.body;
  const existingIndex = cachedData.products.findIndex((p: any) => p.id === newProduct.id);
  if (existingIndex > -1) {
    cachedData.products[existingIndex] = newProduct;
  } else {
    cachedData.products.push(newProduct);
  }
  res.json({ success: true });
});

router.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  cachedData.products = cachedData.products.filter((p: any) => p.id !== id);
  res.json({ success: true });
});

router.post("/banners", (req, res) => {
  cachedData.banners = req.body;
  res.json({ success: true });
});

router.post("/promo/use", (req, res) => {
  const { code } = req.body;
  if (!cachedData.promoCodes) cachedData.promoCodes = [];
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

router.post("/orders", (req, res) => {
  const newOrder = { ...req.body, id: `ORD-${Date.now()}` };
  if (!cachedData.orders) cachedData.orders = [];
  cachedData.orders.push(newOrder);
  res.json({ success: true, order: newOrder });
});

router.post("/orders/update", (req, res) => {
  const { id, status, trackNumber } = req.body;
  if (!cachedData.orders) cachedData.orders = [];
  const orderIndex = cachedData.orders.findIndex((o: any) => o.id === id);
  if (orderIndex > -1) {
    cachedData.orders[orderIndex] = { ...cachedData.orders[orderIndex], status, trackNumber };
    res.json({ success: true, order: cachedData.orders[orderIndex] });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

router.delete("/orders/:id", (req, res) => {
  const { id } = req.params;
  if (!cachedData.orders) cachedData.orders = [];
  cachedData.orders = cachedData.orders.filter((o: any) => o.id !== id);
  res.json({ success: true });
});

router.post("/referral/add", (req, res) => {
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

router.post("/products/:id/reviews", (req, res) => {
  const { id } = req.params;
  const review = { ...req.body, id: `REV-${Date.now()}`, date: new Date().toISOString().split('T')[0] };
  const productIndex = cachedData.products.findIndex((p: any) => p.id === id);
  if (productIndex > -1) {
    const product = cachedData.products[productIndex] as any;
    if (!product.reviews) product.reviews = [];
    product.reviews.unshift(review);
    const reviews = product.reviews;
    const avgRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length;
    product.rating = Number(avgRating.toFixed(1));
    res.json({ success: true, review });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.use("/api", router);
app.use("/", router);

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
export { app };
