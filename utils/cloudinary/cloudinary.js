import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (file) => {
    try {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
      });
      return uploadResponse;
    } catch (error) {
      console.log("Cloudinary Error :", error);
    }
  };