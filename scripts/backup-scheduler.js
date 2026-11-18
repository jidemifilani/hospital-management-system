#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

/**
 * Runs the backup once a day, at a fixed hour.
 *
 *   node scripts/backup-scheduler.js
 *
 * Every other recurring job in this system is an @Cron inside the API. Backups
 * are not, because they need pg_dump, which the API image does not carry — so
 * until now they were the one recurring task nobody had scheduled, and a
 * hospital would have run on whatever backup someone last took by hand.
 *
 * The wait is computed from the clock rather than slept for a fixed 24 hours,
 * so a restart does not drag the backup around the day, and an hour that has
 * already passed today is taken tomorrow instead of immediately.
 *
 * Environment:
 *   BACKUP_HOUR   hour of the day to run, 0-23, local time. Default 2.
 *   plus everything scripts/backup.js needs.
 */

const HOUR = (() => {
  const raw = process.env.BACKUP_HOUR;
  if (raw === undefined || raw === "") return 2;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    console.error(`BACKUP_HOUR must be an integer 0-23, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return n;
})();

function msUntilNextRun(now = new Date()) {
  const next = new Date(now);
  next.setHours(HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function runBackup() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, "backup.js")], {
      stdio: "inherit",
      env: process.env,
    });
    // A failed backup must not stop the schedule: tomorrow's attempt may well
    // succeed, and a scheduler that exits on the first failure is a scheduler
    // that silently stopped backing up months ago.
    child.on("exit", (code) => {
      if (code !== 0) console.error(`Backup exited with ${code}; staying scheduled`);
      resolve();
    });
    child.on("error", (error) => {
      console.error(`Backup could not be started: ${error.message}`);
      resolve();
    });
  });
}

async function main() {
  console.log(`Backup scheduler up; running daily at ${String(HOUR).padStart(2, "0")}:00`);

  for (;;) {
    const wait = msUntilNextRun();
    console.log(`Next backup in ${Math.round(wait / 60000)} minutes`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    await runBackup();
    // A run that finishes inside the same minute would otherwise be picked up
    // again by the next computation.
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
}

main();
