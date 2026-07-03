const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    nome: "Café Aroma",
    horario: "08:00 às 20:00",
    endereco: "Rua do Café, 100",
    telefone: "(11) 99999-9999"
  });
});

module.exports = router;