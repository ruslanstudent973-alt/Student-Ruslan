import { Product, User, Order, Banner } from '../types';

export const initialData: {
  products: Product[];
  users: User[];
  orders: Order[];
  banners: Banner[];
  supportMessages: any[];
  promoCodes: any[];
  partnerships: any[];
  wishlists: any;
} = {
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
