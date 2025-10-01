#!/usr/bin/env node

/**
 * AptoFi Test Runner
 * 
 * This script runs comprehensive tests for AptoFi smart contracts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  CONTRACTS_DIR: path.join(__dirname, '../contracts'),
  TESTS_DIR: path.join(__dirname, '../contracts/tests'),
  COVERAGE_DIR: path.join(__dirname, '../coverage'),
};

class AptoFiTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
    };
  }

  async runTests() {
    console.log('🧪 Starting AptoFi Smart Contract Tests...\n');

    // Ensure test directory exists
    if (!fs.existsSync(CONFIG.TESTS_DIR)) {
      console.error('❌ Tests directory not found:', CONFIG.TESTS_DIR);
      process.exit(1);
    }

    // Get all test files
    const testFiles = fs.readdirSync(CONFIG.TESTS_DIR)
      .filter(file => file.endsWith('_test.move'));

    if (testFiles.length === 0) {
      console.log('⚠️  No test files found');
      return;
    }

    console.log(`Found ${testFiles.length} test files:\n`);

    // Run each test file
    for (const testFile of testFiles) {
      await this.runTestFile(testFile);
    }

    this.printSummary();
  }

  async runTestFile(testFile) {
    const testName = testFile.replace('_test.move', '');
    console.log(`📋 Running tests for ${testName}...`);

    try {
      // Run Aptos Move tests
      const command = `cd ${CONFIG.CONTRACTS_DIR} && aptos move test --filter ${testName}`;
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse test results
      const results = this.parseTestOutput(output, testFile);
      this.testResults.details.push(results);

      if (results.success) {
        console.log(`✅ ${testName}: ${results.passed}/${results.total} tests passed`);
        this.testResults.passed += results.passed;
      } else {
        console.log(`❌ ${testName}: ${results.failed}/${results.total} tests failed`);
        this.testResults.failed += results.failed;
        console.log(`   Failures: ${results.failures.join(', ')}`);
      }

      this.testResults.total += results.total;

    } catch (error) {
      console.log(`❌ ${testName}: Test execution failed`);
      console.log(`   Error: ${error.message}`);

      this.testResults.details.push({
        file: testFile,
        success: false,
        total: 1,
        passed: 0,
        failed: 1,
        failures: ['Test execution failed'],
        error: error.message,
      });

      this.testResults.failed += 1;
      this.testResults.total += 1;
    }

    console.log('');
  }

  parseTestOutput(output, testFile) {
    const lines = output.split('\n');
    const results = {
      file: testFile,
      success: true,
      total: 0,
      passed: 0,
      failed: 0,
      failures: [],
    };

    let inTestResults = false;

    for (const line of lines) {
      if (line.includes('Test result:')) {
        inTestResults = true;
        continue;
      }

      if (inTestResults) {
        if (line.includes('PASS')) {
          results.passed += 1;
          results.total += 1;
        } else if (line.includes('FAIL')) {
          results.failed += 1;
          results.total += 1;
          results.success = false;

          // Extract test name
          const testName = line.split('::').pop()?.trim();
          if (testName) {
            results.failures.push(testName);
          }
        }
      }
    }

    return results;
  }

  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);

    const successRate = this.testResults.total > 0
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
      : 0;

    console.log(`Success Rate: ${successRate}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      for (const result of this.testResults.details) {
        if (!result.success) {
          console.log(`  ${result.file}: ${result.failures.join(', ')}`);
        }
      }
    }

    // Save results to file
    this.saveResults();

    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n💥 Some tests failed. Please review and fix.');
      process.exit(1);
    }
  }

  saveResults() {
    const resultsPath = path.join(__dirname, '../test-results.json');
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: this.testResults.total > 0
          ? ((this.testResults.passed / this.testResults.total) * 100)
          : 0,
      },
      details: this.testResults.details,
    };

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Test results saved to: ${resultsPath}`);
  }

  async runLinting() {
    console.log('🔍 Running Move linter...');

    try {
      const command = `cd ${CONFIG.CONTRACTS_DIR} && aptos move compile`;
      execSync(command, { stdio: 'pipe' });
      console.log('✅ Move linting passed');
    } catch (error) {
      console.log('❌ Move linting failed');
      console.log(error.stdout?.toString() || error.message);
    }
  }

  async runCoverage() {
    console.log('📈 Generating test coverage...');

    try {
      // Create coverage directory
      if (!fs.existsSync(CONFIG.COVERAGE_DIR)) {
        fs.mkdirSync(CONFIG.COVERAGE_DIR, { recursive: true });
      }

      const command = `cd ${CONFIG.CONTRACTS_DIR} && aptos move test --coverage`;
      const output = execSync(command, { encoding: 'utf8' });

      // Save coverage report
      const coveragePath = path.join(CONFIG.COVERAGE_DIR, 'coverage.txt');
      fs.writeFileSync(coveragePath, output);

      console.log(`✅ Coverage report saved to: ${coveragePath}`);
    } catch (error) {
      console.log('❌ Coverage generation failed');
      console.log(error.message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const tester = new AptoFiTester();

  if (args.includes('--help') || args.includes('-h')) {
    console.log('AptoFi Test Runner');
    console.log('');
    console.log('Usage: node test.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --lint      Run Move linter only');
    console.log('  --coverage  Generate test coverage report');
    console.log('  --help, -h  Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node test.js              # Run all tests');
    console.log('  node test.js --lint       # Run linter only');
    console.log('  node test.js --coverage   # Run tests with coverage');
    return;
  }

  try {
    if (args.includes('--lint')) {
      await tester.runLinting();
    } else if (args.includes('--coverage')) {
      await tester.runTests();
      await tester.runCoverage();
    } else {
      await tester.runLinting();
      await tester.runTests();
    }
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AptoFiTester };