"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
const crypto_1 = require("crypto");
const ALGORITHM = "aes-256-gcm";
function getKey(secret) {
    return (0, crypto_1.createHash)("sha256").update(secret).digest();
}
function encryptField(plaintext, secret) {
    const key = getKey(secret);
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}
function decryptField(ciphertext, secret) {
    const [ivHex, tagHex, dataHex] = ciphertext.split(":");
    if (!ivHex || !tagHex || !dataHex)
        throw new Error("Invalid ciphertext format");
    const key = getKey(secret);
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, "hex")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
//# sourceMappingURL=crypto.js.map