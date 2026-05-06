const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const createFirstAdmin = async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    // 2. Hash the Password
    const password = 'Admin@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Prepare Admin Data
    const firstAdmin = new Admin({
      fullName: "Adminone",
      nic: "199509302708",
      email: "nethmi@example.com",
      password: "$2a$10$PDdZlLGyEbdxI8T4olPrRecy8KgZEQeRLMIVA7CQ8lGLyVr2M2AuW", // Use the hashed password here
      telephone: "0712345678",
      district: "Colombo",
      role: "Admin"
    });

    // 4. Save to Database
    await firstAdmin.save();
    console.log("First Admin created successfully!");
    console.log("Email: nethmi@example.com");
    console.log("Password: Admin@123");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createFirstAdmin();
