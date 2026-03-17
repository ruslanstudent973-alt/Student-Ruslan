import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initial data
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

// In-memory store
let cachedData = { ...initialData };

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

const router = express.Router();

router.get("/", (req, res) => {
  console.log("[API] Root route hit");
  res.json({ message: "Ruslan Shop API is running", version: "1.0.0" });
});

router.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

router.get("/data", (req, res) => {
  res.json(cachedData);
});

router.post("/users", (req, res) => {
  try {
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
  } catch (e: any) {
    console.error("Users POST error:", e);
    res.status(500).json({ error: "Server Error", message: e.message });
  }
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

// API 404 handler
router.use((req, res) => {
  res.status(404).json({ error: "API Route not found", path: req.url });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;
