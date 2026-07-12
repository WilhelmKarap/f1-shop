const fs = require("fs");
const path = require("path");

const mutableRoot = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const databasePath = path.join(mutableRoot, "database.db");
const uploadsDir = path.join(mutableRoot, "uploads");
const uploadTypes = ["products", "categories", "banners", "qr", "logo"];

function ensureStorage() {
  fs.mkdirSync(mutableRoot, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  for (const type of uploadTypes) {
    fs.mkdirSync(path.join(uploadsDir, type), { recursive: true });
  }
}

function safeJoin(root, unsafePath) {
  const target = path.resolve(root, unsafePath);
  const base = path.resolve(root);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error("Path traversal is not allowed");
  }
  return target;
}

function uploadPath(type) {
  const cleanType = uploadTypes.includes(type) ? type : "products";
  const dir = path.join(uploadsDir, cleanType);
  fs.mkdirSync(dir, { recursive: true });
  return { cleanType, dir };
}

ensureStorage();

module.exports = {
  mutableRoot,
  databasePath,
  uploadsDir,
  uploadTypes,
  ensureStorage,
  safeJoin,
  uploadPath,
};
