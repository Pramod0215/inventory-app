import { readFile } from 'node:fs/promises';

const [minimumValue, ...reportPaths] = process.argv.slice(2);
const minimum = Number(minimumValue);

if (!Number.isInteger(minimum) || minimum < 1 || reportPaths.length === 0) {
  console.error('Usage: node scripts/check-test-count.mjs <minimum> <vitest-json-report>...');
  process.exit(2);
}

let total = 0;
let failures = 0;

for (const reportPath of reportPaths) {
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch (error) {
    console.error(`Unable to read test report "${reportPath}": ${error.message}`);
    process.exit(2);
  }

  if (!Number.isInteger(report.numTotalTests) || !Number.isInteger(report.numFailedTests)) {
    console.error(`Test report "${reportPath}" does not contain valid Vitest test counts`);
    process.exit(2);
  }

  total += report.numTotalTests;
  failures += report.numFailedTests;
}

console.info(`Executed ${total} test cases; minimum required: ${minimum}.`);

if (failures > 0) {
  console.error(`${failures} test case(s) failed.`);
  process.exit(1);
}

if (total < minimum) {
  console.error(`Test case count is below the required minimum of ${minimum}.`);
  process.exit(1);
}
