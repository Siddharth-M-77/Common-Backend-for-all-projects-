import User from "../model/user.model.js";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1] || req?.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = decoded.userId;
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = user;
  next();
};

export default isAuthenticated;
