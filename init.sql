CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    descricao TEXT,
    preco NUMERIC(10,2),
    categoria VARCHAR(50),
    imagem TEXT
);

INSERT INTO produtos (nome, descricao, preco, categoria, imagem)
VALUES
('Espresso','Café espresso',8.50,'Café','https://exemplo.com/espresso.jpg'),
('Cappuccino','Espresso com leite',14.00,'Café','https://exemplo.com/cappuccino.jpg');

CREATE TABLE loja (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    horario VARCHAR(100),
    endereco VARCHAR(150),
    telefone VARCHAR(30)
);

INSERT INTO loja (nome, horario, endereco, telefone)
VALUES
('Café Aroma','08:00 às 20:00','Rua do Café, 100','(11) 99999-9999');