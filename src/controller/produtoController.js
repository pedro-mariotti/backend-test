const pool = require("../config/database");

exports.listarProdutos = async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT * FROM produtos ORDER BY id"
    );

    res.json(resultado.rows);

  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: "Erro ao buscar produtos"
    });
  }
};