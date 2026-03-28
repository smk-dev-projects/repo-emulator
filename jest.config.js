{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/tests"],
  "testMatch": ["**/*.test.ts"],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/cli.ts"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov", "html"],
  "coverageThreshold": {
    "global": {
      "branches": 50,
      "functions": 50,
      "lines": 50,
      "statements": 50
    }
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@commands/(.*)$": "<rootDir>/src/commands/$1",
    "^@detectors/(.*)$": "<rootDir>/src/detectors/$1",
    "^@env-creators/(.*)$": "<rootDir>/src/env-creators/$1",
    "^@mcp-generator/(.*)$": "<rootDir>/src/mcp-generator/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1"
  },
  "setupFilesAfterEnv": [],
  "verbose": true,
  "silent": false
}
