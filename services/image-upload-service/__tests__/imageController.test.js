const request = require('supertest');
const app = require('../app');
const path = require('path');
const fs = require('fs/promises');

// Mock all external dependencies correctly.
// The mock factory for a module must be a function that returns the mocked module.
// It cannot reference variables from the surrounding scope (like 'Image').

jest.mock('../src/models/Image', () => {
    // Define the mock object with a mock constructor and mock methods.
    const mockImageModel = {
        _id: 'mock-image-id',
        originalFilename: 'test-image.jpg',
        uniqueFilename: 'unique-id-test-image.jpg',
        status: 'pending',
        save: jest.fn().mockResolvedValue({
            _id: 'mock-image-id',
            originalFilename: 'test-image.jpg',
            uniqueFilename: 'unique-id-test-image.jpg',
            status: 'pending',
        }),
    };
    // The mock factory returns a mock class (constructor) that, when called,
    // returns our mock object. This simulates `const newImage = new Image(...)`.
    const Image = jest.fn(() => mockImageModel);
    return Image;
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(null),
}));

// Mock database connection
jest.mock('../src/config/db', () => ({
    connectDB: jest.fn(() => Promise.resolve()),
}));

// Mock RabbitMQ connection and channel
jest.mock('../src/config/rabbitmq', () => ({
    connectRabbitMQ: jest.fn(() => Promise.resolve()),
    getChannel: jest.fn(() => ({
        sendToQueue: jest.fn(() => true),
    })),
}));

describe('Image Upload API', () => {
    // A dummy 'test-image.jpg' file must be in this __tests__ directory.
    test('should upload an image and return a 202 status code', async () => {
        const response = await request(app)
            .post('/api/images/upload')
            .attach('image', path.join(__dirname, 'test-image.jpg'));

        expect(response.statusCode).toBe(202);
        expect(response.body).toHaveProperty('message', 'Image uploaded successfully and queued for processing.');
    });

    test('should return a 400 status code if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/images/upload');
        
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message', 'No image file provided.');
    });
});