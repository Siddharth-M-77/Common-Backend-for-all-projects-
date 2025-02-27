import express from "express";
import userRoutes from "./routes/user.route.js";
import dotenv from "dotenv";
import connectDB from "./DB/connection.js";
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();
const PORT = 6000;
app.use(express.json());
app.use("/api/user", userRoutes);
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to the database", err);
  });
