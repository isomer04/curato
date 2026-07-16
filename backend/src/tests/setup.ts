// Jest test setup file

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret';
process.env['DB_HOST'] = 'localhost';
process.env['DB_PORT'] = '3306';
process.env['DB_NAME'] = 'healthcare_test';
process.env['DB_USER'] = 'root';
process.env['DB_PASSWORD'] = '';

// Suppress console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
