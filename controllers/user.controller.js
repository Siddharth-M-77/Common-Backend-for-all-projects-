import User from "../model/user.model.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import NodeCache from "node-cache";
import jwt from "jsonwebtoken";

// const otpCache = new NodeCache({ stdTTL: 300 });
// const lastRegisteredEmailCache = new NodeCache({ stdTTL: 300 });
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
    from: `"Stepup" <${process.env.EMAIL}>`,
    to: email,
    subject: "🔐 Your OTP for Secure Register",
    html: `
      <div style="max-width: 400px; margin: auto; padding: 20px; text-align: center; font-family: Arial, sans-serif;
                  border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background: #fff;">
        
        <h2 style="color: #007bff; margin-bottom: 10px;">🔐 Secure OTP</h2>
        <p style="font-size: 16px; font-weight: bold;">Dear User,</p>
        <p style="color: #333; font-size: 14px;">Your One-Time Password (OTP) is:</p>
        
        <!-- OTP Box -->
        <div style="background: #f3f3f3; padding: 12px 24px; font-size: 22px; font-weight: bold;
                    display: inline-block; border-radius: 8px; letter-spacing: 2px; margin: 10px 0;
                    user-select: all;">
            ${otp}
        </div>

        <p style="font-size: 12px; color: #888; margin-top: 5px;">Tap & Hold to Copy</p>

        <p style="font-size: 12px; color: gray; margin-top: 10px;">Your OTP will expire in 10 minutes.</p>
        
        <p style="font-size: 14px;">For any queries, contact us at 
            <a href="mailto:support@stepup.com" style="color: #007bff; text-decoration: none;">support@stepup.com</a>
        </p>

        <p style="font-weight: bold; color: #007bff; margin-top: 15px;">- The Stepup Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log(req.body);

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await User.findOne({ email });
  console.log(user);

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: "User already verified" });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (user.otp_expiry < Date.now()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // ✅ Password Hash Karo
  const hashedPassword = await bcrypt.hash(user.password, 10);

  // ✅ User ko Verify Karo
  user.password = hashedPassword;
  user.isVerified = true;
  user.otp = undefined;
  user.otp_expiry = undefined;

  await user.save();

  return res
    .status(201)
    .json({ message: "User registered successfully", user });
};

export const registerUser = async (req, res) => {
  const { name, email, password, address, phone, gender } = req.body;

  if (!name || !email || !password || !address || !phone || !gender) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const userExists = await User.findOne({ email });

  if (userExists && userExists.isVerified) {
    return res.status(400).json({ message: "User already exists" });
  }

  const otp = generateOTP(); // ✅ Generate OTP
  const otp_expiry = Date.now() + 5 * 60 * 1000; // ✅ OTP expiry (5 min)

  if (userExists) {
    // ✅ Agar user already exist karta hai par verified nahi hai, toh update karo
    userExists.otp = otp;
    userExists.otp_expiry = otp_expiry;
    await userExists.save();
  } else {
    // ✅ Naya user create karo par isVerified false rahega
    await User.create({
      name,
      email,
      password,
      address,
      phone,
      gender,
      otp,
      otp_expiry,
      isVerified: false,
    });
  }

  // ✅ OTP Email Bhejo
  await sendOTP(email, otp);

  res.status(200).json({ message: "OTP sent to email", email });
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
export const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
