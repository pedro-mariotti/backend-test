const express = require("express");

const router = express.Router();

const lojaController = require("../controllers/lojaController");

router.get("/", lojaController.getLoja);

module.exports = router;