import mongoose, { Schema, type Model } from "mongoose";

export interface IProductSeller {
  name: string;
  avatar?: string;
  rating?: number;
  description?: string;
}

export interface IProductDocument {
  id: string;
  name: string;
  price: number;
  pinduoduoPrice: number;
  oldPrice?: number;
  vipPrice?: number;
  isVipOnly?: boolean;
  description: string;
  category: string;
  images: string[];
  video?: string;
  videos?: string[];
  sizes: string[];
  rating: number;
  salesCount: number;
  seller: IProductSeller;
  isOriginal?: boolean;
  isCheapPrice?: boolean;
  isFlashSale?: boolean;
  flashSaleEnd?: number;
  weight?: number;
  reviews?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSellerSchema = new Schema<IProductSeller>(
  {
    name: { type: String, default: "YUYU Shop", trim: true },
    avatar: { type: String, default: "" },
    rating: { type: Number, default: 5 },
    description: { type: String, default: "Rasmiy do'kon" },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProductDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    pinduoduoPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    oldPrice: {
      type: Number,
      min: 0,
    },
    vipPrice: {
      type: Number,
      min: 0,
    },
    isVipOnly: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
      maxlength: 4000,
    },
    category: {
      type: String,
      default: "Boshqa",
      trim: true,
      maxlength: 100,
    },
    images: {
      type: [String],
      required: true,
      default: [],
    },
    video: {
      type: String,
      default: "",
    },
    videos: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: ["Standard"],
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    seller: {
      type: ProductSellerSchema,
      default: () => ({
        name: "YUYU Shop",
        avatar: "",
        rating: 5,
        description: "Rasmiy do'kon",
      }),
    },
    isOriginal: {
      type: Boolean,
      default: false,
    },
    isCheapPrice: {
      type: Boolean,
      default: false,
    },
    isFlashSale: {
      type: Boolean,
      default: false,
    },
    flashSaleEnd: {
      type: Number,
    },
    weight: {
      type: Number,
      default: 0.5,
      min: 0,
    },
    reviews: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "products",
  }
);

const ProductModel: Model<IProductDocument> =
  (mongoose.models.Product as Model<IProductDocument>) ||
  mongoose.model<IProductDocument>("Product", ProductSchema);

export default ProductModel;
