// adminSeeder.js 
const bcrypt = require("bcryptjs");
const User = require("./models/UserSchema");

const adminseeder = async () => {
  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
    console.warn("⚠️ Admin seeding skipped: ADMIN_EMAIL, ADMIN_NAME, or ADMIN_PASSWORD not set in .env");
    return;
  }

  const adminExists = await User.findOne({
    email: ADMIN_EMAIL.toLowerCase().trim(),
    role: "admin",
  });

  if (!adminExists) {
    await User.create({
      name: ADMIN_NAME.trim(),
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "admin",
      phone: "",
    });
    console.log("Admin user created");
  } else {
    console.log("Admin already exists");
  }
};

module.exports = adminseeder;
