import mongoose, { Schema, type Model } from "mongoose";
import type { CargoStage } from "@/lib/cargoStages";

export interface IOrderStatusTimestamps {
  step1?: Date;
  step2?: Date;
  step3?: Date;
  step4?: Date;
}

export interface IOrderItemVariant {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedColor?: string;
  selectedColorImage?: string;
  selectedSize?: string;
}

export interface IOrderDocument {
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
  items?: IOrderItemVariant[];
  price: number;
  status: "pending" | "verifying" | "paid" | "shipped" | "delivered" | "cancelled";
  trackNumber?: string;
  trackingCode?: string;
  cargoStatus: CargoStage;
  cargoWeightKg?: number;
  cargoRatePerKg?: number;
  cargoFeeUzs?: number;
  cargoPaymentStatus?: "pending_weighing" | "unpaid" | "verifying" | "paid";
  cargoReceiptUrl?: string;
  cargoMethod?: "avto" | "avia";
  statusTimestamps?: IOrderStatusTimestamps;
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
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderStatusTimestampsSchema = new Schema<IOrderStatusTimestamps>(
  {
    step1: { type: Date },
    step2: { type: Date },
    step3: { type: Date },
    step4: { type: Date },
  },
  { _id: false }
);

const OrderItemVariantSchema = new Schema<IOrderItemVariant>(
  {
    productId: { type: String, default: "", trim: true },
    productName: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, default: 0, min: 0 },
    selectedColor: { type: String, default: "", trim: true },
    selectedColorImage: { type: String, default: "", trim: true },
    selectedSize: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    telegramId: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      default: "Mijoz",
      trim: true,
    },
    productId: {
      type: String,
      default: "",
      trim: true,
    },
    productName: {
      type: String,
      default: "Mahsulot",
      trim: true,
    },
    size: {
      type: String,
      default: "Standard",
      trim: true,
    },
    selectedSize: {
      type: String,
      default: "",
      trim: true,
    },
    selectedColor: {
      type: String,
      default: "",
      trim: true,
    },
    selectedColorImage: {
      type: String,
      default: "",
      trim: true,
    },
    items: {
      type: [OrderItemVariantSchema],
      default: [],
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "verifying", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    trackNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    trackingCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    cargoStatus: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    cargoWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    cargoRatePerKg: {
      type: Number,
      default: 76800,
      min: 0,
    },
    cargoFeeUzs: {
      type: Number,
      default: 0,
      min: 0,
    },
    cargoPaymentStatus: {
      type: String,
      enum: ["pending_weighing", "unpaid", "verifying", "paid"],
      default: "pending_weighing",
    },
    cargoReceiptUrl: {
      type: String,
      default: "",
    },
    cargoMethod: {
      type: String,
      enum: ["avto", "avia"],
      default: "avto",
    },
    statusTimestamps: {
      type: OrderStatusTimestampsSchema,
      default: () => ({ step1: new Date() }),
    },
    date: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },
    receiptImage: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    cashbackUsed: {
      type: Number,
      default: 0,
    },
    cashbackEarned: {
      type: Number,
      default: 0,
    },
    vipRewardApplied: {
      type: Boolean,
      default: false,
    },
    referredBy: {
      type: String,
      default: null,
    },
    referredAffiliateId: {
      type: String,
      default: null,
    },
    affiliateCommissionAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "orders",
  }
);

const OrderModel: Model<IOrderDocument> =
  (mongoose.models.Order as Model<IOrderDocument>) ||
  mongoose.model<IOrderDocument>("Order", OrderSchema);

export default OrderModel;
