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

export interface ProductColorVariant {
  name: string;
  imageUrl: string;
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
  colorVariants?: ProductColorVariant[];
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
  selectedSize?: string;
  selectedColor?: string;
  selectedColorImage?: string;
  quantity: number;
}

export type CargoStage = 1 | 2 | 3 | 4;

export type CargoPaymentStatus = 'pending_weighing' | 'unpaid' | 'verifying' | 'paid';
export type CargoMethod = 'avto' | 'avia';

export interface OrderStatusTimestamps {
  step1?: string | Date | null;
  step2?: string | Date | null;
  step3?: string | Date | null;
  step4?: string | Date | null;
}

export interface OrderItemVariant {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedColor?: string;
  selectedColorImage?: string;
  selectedSize?: string;
}

export interface Order {
  id: string;
  userId: string;
  telegramId?: string;
  username: string;
  productId: string;
  productName: string;
  size: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedColorImage?: string;
  items?: OrderItemVariant[];
  price: number;
  status: 'pending' | 'verifying' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  trackNumber?: string;
  trackingCode?: string;
  cargoStatus?: CargoStage;
  cargoWeightKg?: number;
  cargoRatePerKg?: number;
  cargoFeeUzs?: number;
  cargoPaymentStatus?: CargoPaymentStatus;
  cargoReceiptUrl?: string;
  cargoMethod?: CargoMethod;
  statusTimestamps?: OrderStatusTimestamps;
  date: string;
  timestamp: number;
  receiptImage?: string;
  address?: string;
  cashbackUsed?: number;
  cashbackEarned?: number;
  vipRewardApplied?: boolean;
  referredBy?: string | null;
  referredAffiliateId?: string | null;
  affiliateCommissionAmount?: number;
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
  googleId?: string;
  email?: string;
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

export type AuctionStatus =
  | 'PENDING_APPROVAL'
  | 'UPCOMING'
  | 'LIVE'
  | 'ENDED'
  | 'CANCELLED'
  | 'REJECTED';

export type SellerPayoutStatus =
  | 'YELLOW_PENDING'
  | 'BLUE_AVAILABLE'
  | 'WITHDRAW_REQUESTED'
  | 'PAID';

export interface AuctionBid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  amount: number;
  createdAt: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startPrice: number;
  currentPrice: number;
  minStep: number;
  startsAt: string;
  endsAt: string;
  durationHours?: number;
  status: AuctionStatus;
  highestBidderId: string | null;
  highestBidderName: string | null;
  highestBidderPhone?: string | null;
  bidsCount: number;
  claimedOrderId?: string | null;
  isUserSubmitted?: boolean;
  sellerId?: string | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  sellerVipTier?: VipTier;
  sellerCardNumber?: string | null;
  sellerCardHolder?: string | null;
  rejectReason?: string | null;
  payoutId?: string | null;
  payoutStatus?: SellerPayoutStatus | null;
  buyerConfirmedReceipt?: boolean;
  buyerConfirmedAt?: string | null;
  createdAt?: string;
  latestBids?: AuctionBid[];
}

export interface SellerPayout {
  id: string;
  auctionId: string;
  auctionTitle: string;
  auctionImage: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerCardNumber: string;
  sellerCardHolder: string;
  buyerId: string;
  buyerName: string;
  buyerPhone?: string;
  orderId?: string | null;
  amount: number;
  status: SellerPayoutStatus;
  buyerConfirmedReceipt: boolean;
  buyerConfirmedAt?: string | null;
  unlockedAt?: string | null;
  withdrawRequestedAt?: string | null;
  paidAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerWalletSummary {
  yellowBalance: number;
  blueBalance: number;
  withdrawRequestedBalance: number;
  totalPaidOut: number;
  totalEarned: number;
}

export interface UserSellerQuota {
  isVip: boolean;
  vipTier: VipTier;
  canSubmitNow: boolean;
  lastSubmittedAt: string | null;
  nextAllowedAt: string | null;
  daysRemaining: number;
}

export interface AuctionLeaderboardSeller {
  userId: string;
  name: string;
  vipTier: VipTier;
  soldCount: number;
  totalSalesUzs: number;
  paidCount: number;
}

export interface AuctionLeaderboardBuyer {
  userId: string;
  name: string;
  vipTier: VipTier;
  winsCount: number;
  totalBids: number;
  totalSpentUzs: number;
}

export interface AuctionLeaderboardData {
  topSellers: AuctionLeaderboardSeller[];
  topBidders: AuctionLeaderboardBuyer[];
  stats: {
    totalLive: number;
    totalSoldAuctions: number;
    totalRealSellers: number;
    totalBids: number;
  };
}

export interface UserActiveBidEntry {
  auction: Auction;
  myHighestBid: number;
  isLeading: boolean;
  lastBidAt: string;
}

export interface UserWonAuctionEntry {
  auction: Auction;
  winningAmount: number;
  claimedOrderId?: string | null;
  payoutStatus?: SellerPayoutStatus | null;
  buyerConfirmedReceipt?: boolean;
}

export type ResaleCondition = 'Yangi, birkasi bilan' | 'Faqat o‘lchab ko‘rilgan';
export type ResaleStatus = 'pending_moderation' | 'active' | 'reserved' | 'sold' | 'rejected';

export interface ResaleListing {
  id: string;
  originalOrderId: string;
  productId: string;
  sellerUserId: string;
  sellerName: string;
  title: string;
  category: string;
  size: string;
  originalPrice: number;
  resalePrice: number;
  condition: ResaleCondition;
  city: string;
  sellerPhone: string;
  sellerCard: string;
  images: string[];
  status: ResaleStatus;
  buyerOrderId?: string | null;
  buyerUserId?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  adminNote?: string;
  createdAt: number;
  reservedAt?: number | null;
  soldAt?: number | null;
}

export interface AffiliateProfile {
  userId: string;
  username?: string;
  phoneNumber?: string;
  refCode: string;
  commissionRate: number;
  manualRateOverride?: number | null;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalClicks: number;
  totalOrders: number;
  createdAt: number;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  productName?: string;
  buyerName?: string;
  orderAmount: number;
  ratePercent: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'cancelled';
  createdAt: number;
  approvedAt?: number | null;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  affiliateName?: string;
  affiliateRefCode?: string;
  amount: number;
  cardNumber: string;
  cardHolderName: string;
  status: 'pending' | 'paid' | 'rejected';
  adminNote?: string;
  createdAt: number;
  paidAt?: number | null;
}

export type View =
  | 'loading'
  | 'home'
  | 'catalog'
  | 'videos'
  | 'auction'
  | 'my_auctions'
  | 'admin_auctions'
  | 'admin_seller_payouts'
  | 'find_product'
  | 'my_requests'
  | 'tayyor_bozor'
  | 'admin_tayyor_bozor'
  | 'affiliate_cabinet'
  | 'admin_affiliates'
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
  | 'admin_access'
  | 'admin_security'
  | 'ai_assistant';

export type Language = 'uz' | 'ru' | 'en';
