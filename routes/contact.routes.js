const express = require("express");
const router = express.Router();
const { contactValidator } = require("../middleware/validate.middleware");
const { submitContact } = require("../controllers/misc.controller");

router.post("/", contactValidator, submitContact);

module.exports = router;
