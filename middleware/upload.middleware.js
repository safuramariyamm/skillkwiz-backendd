const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Storage config ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = file.fieldname === "resume" ? "resumes" : "general";
    const dest = path.join(uploadDir, subfolder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────
const resumeFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, and DOCX files are allowed for resume upload"), false);
  }
};

const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"), false);
  }
};

// ─── Multer instances ─────────────────────────────────────────────────────────
const uploadResume = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: resumeFilter,
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for images
  fileFilter: imageFilter,
});

// ─── Helper to get public URL of uploaded file ────────────────────────────────
const getFileUrl = (req, filePath) => {
  const relativePath = filePath.replace(path.join(__dirname, "../"), "").replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}/${relativePath}`;
};

// ─── Helper to delete a file ──────────────────────────────────────────────────
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Error deleting file:", err.message);
  }
};

module.exports = { uploadResume, uploadImage, getFileUrl, deleteFile };
