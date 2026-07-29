require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Seed First Super Admin
|--------------------------------------------------------------------------
|
| یہ script صرف پہلا Super Admin بنانے کے لیے استعمال ہوگی۔
| Password کو User model خود bcrypt کے ذریعے hash کرے گا۔
|
*/

const seedSuperAdmin = async () => {
  try {
    const name = process.env.SUPER_ADMIN_NAME?.trim();
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;

    /*
    |--------------------------------------------------------------------------
    | Environment variables validation
    |--------------------------------------------------------------------------
    */

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the .env file.");
    }

    if (!name) {
      throw new Error(
        "SUPER_ADMIN_NAME is missing from the .env file."
      );
    }

    if (!email) {
      throw new Error(
        "SUPER_ADMIN_EMAIL is missing from the .env file."
      );
    }

    if (!password) {
      throw new Error(
        "SUPER_ADMIN_PASSWORD is missing from the .env file."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Super Admin password must contain at least 8 characters."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Connect with MongoDB
    |--------------------------------------------------------------------------
    */

    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | Check existing Super Admin
    |--------------------------------------------------------------------------
    */

    const existingSuperAdmin = await User.findOne({
      role: "super_admin"
    });

    if (existingSuperAdmin) {
      console.log("----------------------------------------");
      console.log("Super Admin already exists.");
      console.log(`Name: ${existingSuperAdmin.name}`);
      console.log(`Email: ${existingSuperAdmin.email}`);
      console.log("No duplicate Super Admin was created.");
      console.log("----------------------------------------");

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Check whether email is already being used
    |--------------------------------------------------------------------------
    */

    const existingEmailUser = await User.findOne({
      email
    });

    if (existingEmailUser) {
      throw new Error(
        `The email "${email}" is already being used by another user.`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Super Admin
    |--------------------------------------------------------------------------
    */

    const superAdmin = await User.create({
      schoolId: null,
      name,
      email,
      password,
      role: "super_admin",
      isActive: true
    });

    console.log("----------------------------------------");
    console.log("Super Admin created successfully.");
    console.log(`Name: ${superAdmin.name}`);
    console.log(`Email: ${superAdmin.email}`);
    console.log(`Role: ${superAdmin.role}`);
    console.log("----------------------------------------");
  } catch (error) {
    console.error("----------------------------------------");
    console.error("Super Admin creation failed.");
    console.error(`Reason: ${error.message}`);
    console.error("----------------------------------------");

    process.exitCode = 1;
  } finally {
    /*
    |--------------------------------------------------------------------------
    | Close database connection
    |--------------------------------------------------------------------------
    */

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }
  }
};

seedSuperAdmin();