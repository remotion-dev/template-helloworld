#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FLOOR = "4.0.479";
const TARGET = "4.0.488";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function isRemotion(name) {
  return name === "remotion" || name.startsWith("@remotion/");
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value ?? "");
  return match ? match.slice(1).map(Number) : null;
}

function atLeast(value, floor) {
  const left = parseVersion(value);
  const right = parseVersion(floor);
  if (!left || !right) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

function installedVersions(root) {
  const versions = new Map();
  const remotion = readJson(path.join(root, "node_modules", "remotion", "package.json"));
  if (remotion?.version) versions.set("remotion", remotion.version);
  const scope = path.join(root, "node_modules", "@remotion");
  if (fs.existsSync(scope)) {
    for (const name of fs.readdirSync(scope)) {
      const pkg = readJson(path.join(scope, name, "package.json"));
      if (pkg?.version) versions.set(`@remotion/${name}`, pkg.version);
    }
  }
  return versions;
}

function lockIsTracked(root) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "package-lock.json"], {
    cwd: root,
    stdio: "ignore",
  }).status === 0;
}

function inspect(root) {
  const manifest = readJson(path.join(root, "package.json"));
  const direct = new Map(
    Object.entries({ ...manifest?.dependencies, ...manifest?.devDependencies }).filter(([name]) =>
      isRemotion(name),
    ),
  );
  const installed = installedVersions(root);
  const lock = readJson(path.join(root, "package-lock.json"));
  const lockRoot = { ...lock?.packages?.[""]?.dependencies, ...lock?.packages?.[""]?.devDependencies };
  const lockDirect = new Map(Object.entries(lockRoot).filter(([name]) => isRemotion(name)));
  const lockCohort = new Map(
    Object.entries(lock?.packages ?? {})
      .filter(([name, value]) => {
        const packageName = name.slice(13);
        return (
          name.startsWith("node_modules/") &&
          (packageName === "remotion" || /^@remotion\/[^/]+$/.test(packageName)) &&
          value?.version
        );
      })
      .map(([name, value]) => [name.slice(13), value.version]),
  );
  const failures = [];

  if (direct.size === 0 || [...direct.values()].some((version) => version !== TARGET)) {
    failures.push("F012_DIRECT_NOT_EXACT");
  }
  if (installed.size === 0) failures.push("F012_INSTALLED_MISSING");
  else if (new Set(installed.values()).size !== 1) failures.push("F012_INSTALLED_MIXED");
  else if ([...installed.values()][0] !== TARGET) failures.push("F012_INSTALLED_NOT_TARGET");
  if (!lock) failures.push("F012_LOCK_MISSING");
  else {
    if (!lockIsTracked(root)) failures.push("F012_LOCK_UNTRACKED");
    if (lockDirect.size !== direct.size || [...lockDirect.values()].some((version) => version !== TARGET)) {
      failures.push("F012_LOCK_DIRECT_NOT_EXACT");
    }
    if (lockCohort.size === 0 || [...lockCohort.values()].some((version) => version !== TARGET)) {
      failures.push("F012_LOCK_COHORT_NOT_TARGET");
    }
  }

  const floorMet =
    direct.size > 0 &&
    installed.size > 0 &&
    [...direct.values(), ...installed.values()].every((version) => atLeast(version, FLOOR));
  return { direct: direct.size, installed: installed.size, lock: lockCohort.size, failures, floorMet };
}

function writeFixture(root, { directVersion, installedVersions: installed, trackLock = true }) {
  fs.mkdirSync(root, { recursive: true });
  const direct = {
    remotion: directVersion,
    "@remotion/cli": directVersion,
    "@remotion/zod-types": directVersion,
  };
  const dev = { "@remotion/eslint-config-flat": directVersion };
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ dependencies: direct, devDependencies: dev }));
  for (const [name, version] of Object.entries(installed)) {
    const dir = path.join(root, "node_modules", ...name.split("/"));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version }));
  }
  const packages = { "": { dependencies: direct, devDependencies: dev } };
  for (const name of Object.keys({ ...direct, ...dev })) {
    packages[`node_modules/${name}`] = { version: directVersion };
  }
  packages["node_modules/@remotion/eslint-config-flat/node_modules/typescript"] = {
    version: "5.7.3",
  };
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages }));
  spawnSync("git", ["init", "-q"], { cwd: root });
  if (trackLock) spawnSync("git", ["add", "package-lock.json"], { cwd: root });
}

function selfTest() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "f012-version-gate-"));
  const results = [];
  try {
    const vulnerable = path.join(base, "vulnerable");
    writeFixture(vulnerable, {
      directVersion: "4.0.409",
      installedVersions: { remotion: "4.0.409", "@remotion/cli": "4.0.409" },
    });
    results.push(inspect(vulnerable));
    assert.equal(results.at(-1).floorMet, false);
    assert.ok(results.at(-1).failures.includes("F012_DIRECT_NOT_EXACT"));

    const mixed = path.join(base, "mixed");
    writeFixture(mixed, {
      directVersion: TARGET,
      installedVersions: { remotion: TARGET, "@remotion/cli": FLOOR },
    });
    results.push(inspect(mixed));
    assert.ok(results.at(-1).failures.includes("F012_INSTALLED_MIXED"));

    const missing = path.join(base, "missing");
    writeFixture(missing, { directVersion: TARGET, installedVersions: {} });
    results.push(inspect(missing));
    assert.ok(results.at(-1).failures.includes("F012_INSTALLED_MISSING"));

    const untracked = path.join(base, "untracked");
    writeFixture(untracked, {
      directVersion: TARGET,
      installedVersions: { remotion: TARGET, "@remotion/cli": TARGET },
      trackLock: false,
    });
    results.push(inspect(untracked));
    assert.ok(results.at(-1).failures.includes("F012_LOCK_UNTRACKED"));

    const target = path.join(base, "target");
    writeFixture(target, {
      directVersion: TARGET,
      installedVersions: { remotion: TARGET, "@remotion/cli": TARGET },
    });
    results.push(inspect(target));
    assert.deepEqual(results.at(-1).failures, []);
    assert.equal(results.at(-1).floorMet, true);

    const red = results.filter((result) => result.failures.length > 0).length;
    console.log(`F012_VERSION_SELF_TEST_OK red=${red} green=${results.length - red}`);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = inspect(root);
  console.log(result.floorMet ? "F012_ADVISORY_FLOOR_GREEN" : "F012_ADVISORY_FLOOR_RED");
  for (const failure of result.failures) console.log(failure);
  const state = result.failures.length ? "RED" : "GREEN";
  console.log(`F012_VERSION_GATE_${state} direct=${result.direct} installed=${result.installed} lock=${result.lock}`);
  if (result.failures.length) process.exitCode = 1;
}
