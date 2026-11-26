import mongoose, { Schema, type Model } from "mongoose";
import type { VipTier } from "@/types";

export interface IUserDocument {
  username: string;
  telegramId: string;
  phoneNumber?: string;
  password?: string;
  googleId?: string;
  email?: string;
  city?: string;
  isAdmin: boolean;
  avatar?: string;
  bio?: string;
  referralBalance: number;
  invitedCount: number;
  invitedBy?: string;
  vipTier: VipTier;
  totalSpent: number;
  cashbackBalance: number;
  isSubscribedVip: boolean;
  vipExpiresAt?: string | null;
  createdAt?: number;
}

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    telegramId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      maxlength: 120,
    },
    phoneNumber: {
      type: String,
      required: false,
      sparse: true,
      trim: true,
      maxlength: 40,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 128,
    },
    email: {
      type: String,
      required: false,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    city: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: "",
      maxlength: 2048,
    },
    bio: {
      type: String,
      default: "YUYU Shop xaridori",
      maxlength: 300,
    },
    referralBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    invitedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    invitedBy: {
      type: String,
      required: false,
    },
    vipTier: {
      type: String,
      enum: ["NONE", "SILVER", "GOLD", "DIAMOND"],
      default: "NONE",
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashbackBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isSubscribedVip: {
      type: Boolean,
      default: false,
    },
    vipExpiresAt: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Number,
      default: () => Date.now(),
    },
  },
  {
    strict: false,
    collection: "users",
  }
);

const UserModel: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", UserSchema);

export default UserModel;
