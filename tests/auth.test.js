const request = require('supertest');
const app = require('../app');
const db = require('../config/database');

describe('Auth API', () => {
    beforeAll(async () => {
    });
    
    afterAll(async () => {
        await db.pool.end();
    });
    
    it('should login with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });
    
});