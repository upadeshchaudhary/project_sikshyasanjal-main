const bcrypt = require("bcryptjs");
const User = require("./models/UserSchema");

const adminseeder = async () => {
  const adminExists = await User.findOne({
    email: process.env.ADMIN_EMAIL,
    role: "admin",
  });
  if (!adminExists) {
    await User.create({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 8),
      role: "admin",
      phone: "",
    });
    console.log("Admin user created");
  } else {
    console.log("Admin user already exists");
  }
};

module.exports = adminseeder;
