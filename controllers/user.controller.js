import User from "../model/user.model.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import NodeCache from "node-cache";
import jwt from "jsonwebtoken";

const otpCache = new NodeCache({ stdTTL: 300 });
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
export const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email, // ✅ अब email properly define है
    subject: "OTP for verification",
    text: `Your OTP for verification is ${otp}`,
  };

  await transporter.sendMail(mailOptions);
};
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const userData = otpCache.get(email);
  console.log("userData", userData);

  if (!userData) {
    return res.status(400).json({ message: "User not found" });
  }

  if (userData.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (userData.otp_expiry < Date.now()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await User.create({
    name: userData.name,
    email: email,
    password: hashedPassword,
    address: userData.address,
    phone: userData.phone,
    gender: userData.gender,
  });

  // OTP verify होने के बाद cache से हटा दें
  otpCache.del(email);

  return res.status(200).json({
    message: "OTP verified and User created successfully",
    data: user,
  });
};
export const registerUser = async (req, res) => {
  const { name, email, password, address, phone, gender } = req.body;

  if (!name || !email || !password || !address || !phone || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  // ✅ Correctly store all user data in cache
  const otp = generateOTP();
  otpCache.set(email, {
    otp,
    name,
    email, // ✅ email store करें
    password, // ✅ password store करें
    address,
    phone,
    gender,
    otp_expiry: Date.now() + 300000, // OTP expiry time (5 min)
  });

  await sendOTP(email, otp);
  res.status(200).json({ message: "OTP sent to email", otp });
};
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({ message: "Login successful", data: user, token });
};
export const getInfo = async (req, res) => {
  const user = req.user;
  res.status(200).json({ message: "User info", data: user });
};
export const logoutUser = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful" });
};
export const updateInfo = async (req, res) => {
  const { name, email, password, address, phone, gender } = req.body;
  const userId = req.userId;

  try {
    // ✅ Only update provided fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(password && { password: await bcrypt.hash(password, 10) }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(gender && { gender }),
      },
      { new: true, runValidators: true } // ✅ Return updated user & validate fields
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User info updated", data: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
