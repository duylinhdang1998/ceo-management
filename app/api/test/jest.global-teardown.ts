/**
 * jest.global-teardown.ts
 *
 * Runs once after ALL Jest test suites complete.
 * Closes the singleton pg Pool a single time so that no suite's
 * afterAll can race-close the pool before the next suite's beforeAll runs.
 *
 * Register in package.json jest config:
 *   "globalTeardown": "./test/jest.global-teardown.ts"
 */

import { closePool } from '../src/common/db/pool';

export default async function globalTeardown(): Promise<void> {
  await closePool();
}
