const express = require("express");
const cors = require("cors");

const produtos = require("./routes/produtos");
const loja = require("./routes/loja");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/produtos", produtos);
app.use("/api/loja", loja);

module.exports = app;