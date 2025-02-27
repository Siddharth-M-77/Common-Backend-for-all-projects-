import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    address: { type: String },
    phone: { type: String },
    gender: { type: String },
    otp: { type: String },
    otp_expiry: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Define index before creating model
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
