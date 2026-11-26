import mongoose, { Schema, type Model } from "mongoose";

export type PushDeviceType = "android" | "ios" | "desktop" | "unknown";

export interface IPushSubscriptionDocument {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceType: PushDeviceType;
  userAgent?: string;
  isStandalone?: boolean;
  lastActiveAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      maxlength: 80,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 2048,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
        trim: true,
        maxlength: 512,
      },
      auth: {
        type: String,
        required: true,
        trim: true,
        maxlength: 256,
      },
    },
    deviceType: {
      type: String,
      enum: ["android", "ios", "desktop", "unknown"],
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 300,
    },
    isStandalone: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "pushSubscriptions",
  }
);

PushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  (mongoose.models.PushSubscription as Model<IPushSubscriptionDocument>) ||
  mongoose.model<IPushSubscriptionDocument>("PushSubscription", PushSubscriptionSchema);

export default PushSubscriptionModel;
