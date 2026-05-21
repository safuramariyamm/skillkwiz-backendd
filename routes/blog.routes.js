const express = require("express");
const router = express.Router();
const { protect, authorize, optionalAuth } = require("../middleware/auth.middleware");
const { blogValidator } = require("../middleware/validate.middleware");
const { getBlogs, getBlogBySlug, createBlog, publishBlog } = require("../controllers/misc.controller");

router.get("/", optionalAuth, getBlogs);
router.get("/:slug", optionalAuth, getBlogBySlug);
router.post("/", protect, authorize("admin"), blogValidator, createBlog);
router.patch("/:id/publish", protect, authorize("admin"), publishBlog);

module.exports = router;
