const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.createHash("sha256")
  .update(process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || "default-message-key")
  .digest();

function encryptText(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptText(data, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = {
  encryptText,
  decryptText,
};
