// backend/utils/messageCrypto.js
const crypto = require("crypto");

if (!process.env.MESSAGE_ENCRYPTION_KEY) {
  console.warn("⚠️  MESSAGE_ENCRYPTION_KEY not set. Messages will not be encrypted. Set it in .env for production.");
}

const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const ALGORITHM     = "aes-256-gcm";

function encryptText(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted    += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return { data: encrypted, iv: iv.toString("hex"), authTag: authTag.toString("hex") };
}

function decryptText(encryptedData, ivHex, authTagHex) {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted    += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

module.exports = { encryptText, decryptText };
