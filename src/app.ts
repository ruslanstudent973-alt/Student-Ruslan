import express from "express";
import cors from "cors";

const initialData: any = {
  products: [
    {
      id: "p1",
      name: "AirPods Pro Gen 2 (Premium)",
      pinduoduoPrice: 180,
      oldPrice: 450000,
      description: "Eng so'nggi rusumdagi AirPods Pro. Shovqinni kamaytirish (ANC) va yuqori sifatli ovoz. Xitoyning eng yaxshi fabrikasidan keltiriladi.",
      category: "Elektronika",
      images: [
        "https://images.unsplash.com/photo-1588423770186-80f3ef9adad0?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600294037681-c80b4cbfa11c?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-girl-putting-on-white-wireless-headphones-to-listen-to-music-34533-large.mp4"
      ],
      sizes: ["Oq", "Qora"],
      rating: 4.9,
      salesCount: 1240,
      seller: {
        name: "Ruslan Electronics",
        avatar: "",
        rating: 5,
        description: "Ishonchli yetkazib beruvchi"
      },
      isOriginal: true,
      isCheapPrice: true,
      weight: 0.2
    },
    {
      id: "p2",
      name: "Nike Air Jordan 1 Low",
      pinduoduoPrice: 250,
      oldPrice: 600000,
      description: "Sifatli krossovkalar. Kundalik kiyish uchun juda qulay va zamonaviy dizayn. Ranglari tanlovda mavjud.",
      category: "Oyoq kiyim",
      images: [
        "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-shoes-walking-on-pavement-4361-large.mp4"
      ],
      sizes: ["39", "40", "41", "42", "43", "44"],
      rating: 4.8,
      salesCount: 850,
      seller: {
        name: "Sneaker Shop Uz",
        avatar: "",
        rating: 4.9,
        description: "Brend oyoq kiyimlar mutaxassisi"
      },
      isOriginal: true,
      weight: 1.2
    },
    {
      id: "p3",
      name: "Smart Watch Ultra 8",
      pinduoduoPrice: 140,
      oldPrice: 350000,
      description: "Eng yangi smart soat. Qo'ng'iroq qilish, xabarlarni o'qish va salomatlikni kuzatish funksivari mavjud. Ekran sifati juda yuqori.",
      category: "Gadjeytlar",
      images: [
        "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-young-man-setting-up-his-smart-watch-before-a-workout-34139-large.mp4"
      ],
      sizes: ["Orange", "Grey", "Black"],
      rating: 4.7,
      salesCount: 2100,
      seller: {
        name: "Gid Store",
        avatar: "",
        rating: 4.8,
        description: "Xitoydan to'g'ridan-to'g'ri yetkazish"
      },
      isCheapPrice: true,
      weight: 0.3
    }
  ],
  users: [
    {
      telegramId: "8215056224",
      username: "Ruslan Admin",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
      referralBalance: 0,
      invitedCount: 0,
      bio: "Ruslan Shop asoschisi",
      isAdmin: true
    }
  ],
  orders: [],
  banners: [
    {
      id: "b1",
      title: "Yangi Mavsum To'plami",
      subtitle: "50% gacha chegirmalar",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop",
      link: "catalog"
    }
  ],
  supportMessages: [],
  promoCodes: [],
  partnerships: [],
  wishlists: {}
};

// In-memory data store
let cachedData: any = { ...initialData };

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get("/ping", (req, res) => res.send("pong"));
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// API: Sync data
app.post("/api/sync", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.products) {
      return res.status(400).json({ error: "Noto'g'ri ma'lumotlar formati" });
    }
    cachedData = { ...data };
    res.json({ success: true, message: "Ma'lumotlar xotiraga muvaffaqiyatli saqlandi." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get all data
app.get("/api/data", async (req, res) => {
    res.json(cachedData);
});

// API: Get DB Status
app.get("/api/db-status", async (req, res) => {
  res.json({ 
    connected: true,
    usingMongo: false,
    productCount: cachedData.products?.length || 0,
    status: "In-Memory Mode"
  });
});

// API: Register/Update user
app.post("/api/users", async (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser || !newUser.phoneNumber) {
      return res.status(400).json({ error: "phoneNumber majburiy" });
    }
    if (!cachedData.users) cachedData.users = [];
    const existingIndex = cachedData.users.findIndex((u: any) => u.phoneNumber === newUser.phoneNumber);
    if (existingIndex > -1) {
      cachedData.users[existingIndex] = { ...cachedData.users[existingIndex], ...newUser };
    } else {
      cachedData.users.push(newUser);
    }
    res.json({ success: true, user: newUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Notify Admin via Telegram
app.post("/api/notify", async (req, res) => {
  const { message, chatId } = req.body;
  const token = process.env.TELEGRAM_TOKEN || '8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc';
  const targetChatId = chatId || '8215056224';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'Markdown' }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: "Failed to send notification", details: e.message });
  }
});

// API: Debug DB
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
  if (!cachedData.partnerships) cachedData.partnerships = [];
  cachedData.partnerships.push(newRequest);
  res.json({ success: true, request: newRequest });
});

// API: Update partnership
app.post("/api/partnerships/update", async (req, res) => {
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

// API: Wishlist toggle
app.post("/api/wishlist/toggle", async (req, res) => {
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

// API: Support messages
app.post("/api/support", async (req, res) => {
  const newMessage = { ...req.body, id: `MSG-${Date.now()}`, date: new Date().toISOString() };
  if (!cachedData.supportMessages) cachedData.supportMessages = [];
  cachedData.supportMessages.push(newMessage);
  res.json({ success: true });
});

// API: Update products
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

// API: Delete product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  cachedData.products = cachedData.products.filter((p: any) => p.id !== id);
  res.json({ success: true });
});

// API: Update banners
app.post("/api/banners", async (req, res) => {
  cachedData.banners = req.body;
  res.json({ success: true });
});

// API: Use promo code
app.post("/api/promo/use", async (req, res) => {
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

// API: Create order
app.post("/api/orders", async (req, res) => {
  const newOrder = { ...req.body, id: `ORD-${Date.now()}` };
  if (!cachedData.orders) cachedData.orders = [];
  cachedData.orders.push(newOrder);
  res.json({ success: true, order: newOrder });
});

// API: Update order
app.post("/api/orders/update", async (req, res) => {
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

// API: Delete order
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  if (!cachedData.orders) cachedData.orders = [];
  cachedData.orders = cachedData.orders.filter((o: any) => o.id !== id);
  res.json({ success: true });
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
    if (!cachedData.products[productIndex].reviews) cachedData.products[productIndex].reviews = [];
    cachedData.products[productIndex].reviews.unshift(review);
    const reviews = cachedData.products[productIndex].reviews;
    const avgRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length;
    cachedData.products[productIndex].rating = Number(avgRating.toFixed(1));
    res.json({ success: true, review });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// 404 Handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API topilmadi: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[App Error]:', err);
  if (req.url.startsWith('/api')) {
    return res.status(500).json({ error: 'Server xatoligi', message: err.message });
  }
  next(err);
});

export { app };
export default app;
