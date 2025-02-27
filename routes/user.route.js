import express from "express";
import { registerUser, verifyOTP, loginUser, getInfo, logoutUser, updateInfo, updatePassword } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/IsAuthenticated.js";

const router = express.Router();

router.route("/register").post(registerUser);
router.route("/verify-otp").post(verifyOTP);
router.route("/login").post(loginUser);
router.route("/getInfo").get(isAuthenticated, getInfo);
router.route("/logout").get(logoutUser);
router.route("/updateInfo").put(isAuthenticated, updateInfo);
router.route("/updatePassword").patch(isAuthenticated, updatePassword);
export default router;
