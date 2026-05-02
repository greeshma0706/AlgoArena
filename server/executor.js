const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Run user code against test cases
 * @param {string} code - The user's Python code
 * @param {object} problem - The problem with test cases
 * @returns {{ passed: number, total: number, allPassed: boolean, results: Array }}
 */
function runCode(code, problem) {
  const testCases = problem.testCases;
  const results = [];
  let passed = 0;
  const total = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const result = runSingleTest(code, tc.input, tc.expected, i);
    results.push({
      ...result,
      hidden: tc.hidden,
    });
    if (result.passed) passed++;
  }

  return {
    passed,
    total,
    allPassed: passed === total,
    results,
  };
}

/**
 * Run a single test case
 */
function runSingleTest(code, input, expected, index) {
  const tempFile = path.join(os.tmpdir(), `algoarena_${Date.now()}_${index}.py`);

  try {
    // Write the code to a temp file
    fs.writeFileSync(tempFile, code, 'utf8');

    // Run the code with the test input
    const output = execSync(`python "${tempFile}"`, {
      input: input,
      timeout: 5000, // 5 second timeout
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024, // 1MB max output
    });

    const trimmedOutput = output.trim();
    const trimmedExpected = expected.trim();
    const didPass = trimmedOutput === trimmedExpected;

    return {
      passed: didPass,
      output: trimmedOutput,
      expected: trimmedExpected,
      error: null,
    };
  } catch (error) {
    let errorMsg = 'Unknown error';

    if (error.killed || error.signal === 'SIGTERM') {
      errorMsg = 'Time Limit Exceeded (5s)';
    } else if (error.stderr) {
      // Extract just the last line of the Python traceback
      const lines = error.stderr.trim().split('\n');
      errorMsg = lines[lines.length - 1] || 'Runtime Error';
    } else if (error.message) {
      errorMsg = error.message.substring(0, 200);
    }

    return {
      passed: false,
      output: null,
      expected: expected.trim(),
      error: errorMsg,
    };
  } finally {
    // Cleanup temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { runCode };
