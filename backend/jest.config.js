module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', 'middleware/**/*.js', 'routes/**/*.js', 'services/**/*.js', '!src/server.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
};
