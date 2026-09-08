#!/usr/bin/env node
import { run } from "../src/cli.js";

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(`tokenmonitor: ${error?.message ?? error}`);
    process.exit(1);
  },
);
