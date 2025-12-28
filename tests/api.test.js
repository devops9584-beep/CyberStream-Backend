const request = require('supertest');
const app = require('../server');
const db = require('../db');

describe('CyberStream CI Test Suite', () => {
    afterAll(async () => {
        if (db.end) db.end();
    });

    test('Login Admin - Credenciales del Schema', async () => {
        const res = await request(app).post('/api/login').send({
            email: 'admin@cyberstream.com',
            password: '123'
        });
        expect(res.statusCode).toBe(200);
    });

    test('Media Inicio - Carga con datos semilla', async () => {
        const res = await request(app).get('/api/media/inicio');
        expect(res.statusCode).toBe(200);
    });
});