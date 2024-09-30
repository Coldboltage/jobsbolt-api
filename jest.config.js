module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // testMatch: ['**/utils/utils.service.spec.ts'], // Only run tests for utils.service
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
