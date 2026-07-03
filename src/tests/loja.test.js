const request = require("supertest");

const app = require("../app");

describe("GET /api/loja", () => {

    test("Deve retornar as informações da loja", async () => {

        const response = await request(app)
            .get("/api/loja");

        expect(response.statusCode).toBe(200);

        expect(response.body).toHaveProperty("nome");
        expect(response.body).toHaveProperty("horario");
        expect(response.body).toHaveProperty("endereco");
        expect(response.body).toHaveProperty("telefone");

    });

});