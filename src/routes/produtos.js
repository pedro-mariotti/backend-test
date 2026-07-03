const express = require("express");
const router = express.Router();

const produtos = require("../data/produtos");

router.get("/", (req, res) => {
  res.json(produtos);
});

module.exports = router;