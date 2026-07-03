const pool = require("../config/database");

exports.getLoja = async (req, res) => {

  try {

    const resultado = await pool.query(
      "SELECT * FROM loja LIMIT 1"
    );

    res.json(resultado.rows[0]);

  } catch (erro) {

    console.error(erro);

    res.status(500).json({
      erro: "Erro ao buscar informações da loja"
    });

  }

};