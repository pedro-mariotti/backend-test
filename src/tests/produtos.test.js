const request = require("supertest");

const app = require("../app");

describe("GET /api/produtos", () => {

    test("Deve retornar status 200", async () => {

        const response = await request(app)
            .get("/api/produtos");

        expect(response.statusCode).toBe(200);

    });

});

describe("Produtos", () => {

    test("Deve retornar uma lista", async () => {

        const response = await request(app)
            .get("/api/produtos");

        expect(Array.isArray(response.body)).toBe(true);

    });

});

describe("Produtos", () => {

    test("Deve retornar uma lista", async () => {

        const response = await request(app)
            .get("/api/produtos");

        expect(Array.isArray(response.body)).toBe(true);

    });

});

test("Deve possuir pelo menos um produto", async () => {

    const response = await request(app)
        .get("/api/produtos");

    expect(response.body.length).toBeGreaterThan(0);

});

test("Cada produto deve possuir os campos obrigatórios", async () => {

    const response = await request(app)
        .get("/api/produtos");

    const produto = response.body[0];

    expect(produto).toHaveProperty("id");
    expect(produto).toHaveProperty("nome");
    expect(produto).toHaveProperty("descricao");
    expect(produto).toHaveProperty("preco");
    expect(produto).toHaveProperty("categoria");
    expect(produto).toHaveProperty("imagem");

});