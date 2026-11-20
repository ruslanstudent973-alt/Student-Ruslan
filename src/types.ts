export type VipTier = 'NONE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface Review {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  date: string;
}

export interface Product {
  id: string;
  name: string;
  pinduoduoPrice: number;
  oldPrice?: number;
  vipPrice?: number; // Special price in UZS for VIP users
  isVipOnly?: boolean; // Exclusive to VIP members
  description: string;
  category: string;
  images: string[];
  videos?: string[];
  sizes: string[];
  rating: number;
  salesCount: number;
  seller: {
    name: string;
    avatar: string;
    rating: number;
    description: string;
  };
  isOriginal?: boolean;
  isCheapPrice?: boolean;
  reviews?: Review[];
  isFlashSale?: boolean;
  flashSaleEnd?: number;
  weight?: number; // in kg
}

export interface CartItem {
  id: string;
  product: Product;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  productId: string;
  productName: string;
  size: string;
  price: number;
  status: 'pending' | 'verifying' | 'paid' | 'shipped' | 'delivered';
  trackNumber?: string;
  date: string;
  timestamp: number;
  receiptImage?: string;
  address?: string;
  cashbackUsed?: number;
  cashbackEarned?: number;
  vipRewardApplied?: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link?: string;
}

export interface UserMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  reply?: string;
  date: string;
}

export interface VipSettings {
  id: string;
  monthlyPrice: number;
  silverThreshold: number;
  goldThreshold: number;
  diamondThreshold: number;
  silverCashback: number;
  goldCashback: number;
  diamondCashback: number;
  totalCashbackDistributed?: number;
}

export interface User {
  username: string;
  telegramId: string;
  phoneNumber?: string;
  city?: string;
  isAdmin: boolean;
  avatar?: string;
  bio?: string;
  referralBalance: number;
  invitedCount: number;
  invitedBy?: string;
  createdAt?: number;
  // VIP & Loyalty fields
  vipTier?: VipTier;
  totalSpent?: number;
  cashbackBalance?: number;
  isSubscribedVip?: boolean;
  vipExpiresAt?: string | null;
}

export interface VideoComment {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
}

export interface ProductVideo {
  id: string;
  productId: string;
  caption: string;
  videoUrl?: string;
  posterImage?: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'admin' | 'client';
  likes: string[];
  comments: VideoComment[];
  sharesCount: number;
  createdAt: number;
}

export type CustomRequestStatus = 'PENDING' | 'PRICED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export interface CustomRequestQuote {
  price: number;
  deliveryDays: string;
  adminNote?: string;
  quotedAt: string;
}

export interface CustomRequest {
  id: string;
  userId: string;
  username?: string;
  phoneNumber: string;
  imageUrl: string;
  productLink?: string;
  description?: string;
  status: CustomRequestStatus;
  adminQuote?: CustomRequestQuote | null;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDevice {
  id: string;
  label: string;
  userAgentSummary: string;
  role: 'owner' | 'invited';
  createdAt: string;
  lastUsedAt: string;
  revokedAt?: string | null;
}

export interface AdminInvite {
  id: string;
  code: string;
  label: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
  usedByDeviceId?: string | null;
  revoked?: boolean;
}

export type View =
  | 'loading'
  | 'home'
  | 'catalog'
  | 'videos'
  | 'find_product'
  | 'my_requests'
  | 'search'
  | 'profile'
  | 'detail'
  | 'auth'
  | 'admin'
  | 'verify'
  | 'orders'
  | 'referral'
  | 'manage_orders'
  | 'payment'
  | 'user_search'
  | 'admin_add_product'
  | 'cart'
  | 'receipt'
  | 'manage_banners'
  | 'manage_products'
  | 'wishlist'
  | 'support'
  | 'partnership'
  | 'promo'
  | 'stats'
  | 'admin-partnerships'
  | 'admin-support'
  | 'admin-users'
  | 'admin_vip'
  | 'admin_custom_requests'
  | 'admin_access';

export type Language = 'uz' | 'ru' | 'en';
