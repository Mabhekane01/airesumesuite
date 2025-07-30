
// Mock environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['GOOGLE_AI_API_KEY'] = 'test-google-ai-key';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/ai-job-suite-test';
process.env['REDIS_URL'] = 'redis://localhost:6379';

// Global test setup
beforeAll(async () => {
  // Setup test database connections if needed
});

afterAll(async () => {
  // Cleanup test database connections
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, _res: any, next: any) => {
      req.file = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test file content'),
        size: 1024
      };
      next();
    },
    array: () => (req: any, _res: any, next: any) => {
      req.files = [];
      next();
    }
  });
  multer.diskStorage = jest.fn();
  multer.memoryStorage = jest.fn();
  return multer;
});

export {};