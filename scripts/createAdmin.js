import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env"
    );
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
  }

  await connectDB();

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, rounds);

  let admin = await User.findOne({ email }).select("+passwordHash");

  if (admin) {
    admin.name = ADMIN_NAME.trim();
    admin.passwordHash = passwordHash;
    admin.role = "admin";
    admin.isBlocked = false;

    await admin.save();
  } else {
    admin = await User.create({
      name: ADMIN_NAME.trim(),
      email,
      passwordHash,
      role: "admin",
      isBlocked: false
    });
  }

  console.log("Administrator account is ready");
  console.log(`Email: ${admin.email}`);

  await mongoose.disconnect();
};

createAdmin().catch(async (error) => {
  console.error("Failed to create administrator:", error.message);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exitCode = 1;
});