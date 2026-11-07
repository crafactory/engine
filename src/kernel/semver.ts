/* Original bounded semantic-version helpers for the native plugin kernel.
 * This is a documented subset, not a general-purpose semver implementation. */

export interface ParsedVersion {major: number; minor: number; patch: number; prerelease: string[]}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const WILDCARD = /^(?:x|X|\*)$/;
const PRERELEASE = /^[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/;
const MAX_VERSION_NUMBER = Number.MAX_SAFE_INTEGER - 1;

/** Convert a numeric identifier only when it is exactly representable within the bound. */
function toVersionNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= MAX_VERSION_NUMBER ? parsed : null;
}

/** Whether every numeric identifier in a dot-separated list is within the representable bound. */
function numericIdentifiersWithinBound(parts: string[]): boolean {
  return parts.every(part => !/^\d+$/.test(part) || toVersionNumber(part) !== null);
}

/** Parse a strict `major.minor.patch[-prerelease]` string, returning null for anything else. */
export function parseVersion(value: string): ParsedVersion | null {
  if (typeof value !== 'string') return null;
  const match = VERSION.exec(value.trim());
  if (!match) return null;
  const major = toVersionNumber(match[1]), minor = toVersionNumber(match[2]), patch = toVersionNumber(match[3]);
  const prerelease = match[4] ? match[4].split('.') : [];
  if (major === null || minor === null || patch === null || !numericIdentifiersWithinBound(prerelease)) return null;
  return {major, minor, patch, prerelease};
}

/** Compare two parsed versions by core fields, then by documented prerelease rules. */
export function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (const field of ['major', 'minor', 'patch'] as const) {
    if (left[field] !== right[field]) return left[field] < right[field] ? -1 : 1;
  }
  if (!left.prerelease.length && !right.prerelease.length) return 0;
  if (!left.prerelease.length) return 1;
  if (!right.prerelease.length) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index++) {
    const a = left.prerelease[index], b = right.prerelease[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const numericA = /^\d+$/.test(a), numericB = /^\d+$/.test(b);
    if (numericA && numericB) { if (Number(a) !== Number(b)) return Number(a) < Number(b) ? -1 : 1; continue; }
    if (numericA !== numericB) return numericA ? -1 : 1;
    if (a !== b) return a < b ? -1 : 1;
  }
  return 0;
}

interface PartialVersion {major: number | null; minor: number | null; patch: number | null}
interface ComparatorBody {partial: PartialVersion; prerelease: string[]}

/** Read an `x`/`*`-aware comparator body, including an optional prerelease suffix. */
function parseComparatorBody(value: string): ComparatorBody | null {
  const dash = value.indexOf('-');
  const core = dash < 0 ? value : value.slice(0, dash);
  const suffix = dash < 0 ? '' : value.slice(dash + 1);
  const parts = core.trim().split('.');
  if (parts.length > 3) return null;
  const partial: PartialVersion = {major: null, minor: null, patch: null};
  const fields = ['major', 'minor', 'patch'] as const;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (WILDCARD.test(part)) continue;
    if (!/^\d+$/.test(part)) return null;
    const numeric = toVersionNumber(part);
    if (numeric === null) return null;
    partial[fields[index]] = numeric;
  }
  if (!suffix) return {partial, prerelease: []};
  if (!PRERELEASE.test(suffix) || partial.major === null || partial.minor === null || partial.patch === null) return null;
  const prerelease = suffix.split('.');
  if (!numericIdentifiersWithinBound(prerelease)) return null;
  return {partial, prerelease};
}

/** The last partial field that was specified, used to round partial comparator bounds. */
function lastSpecified(partial: PartialVersion): 'major' | 'minor' | null {
  if (partial.major === null) return null;
  if (partial.minor === null) return 'major';
  if (partial.patch === null) return 'minor';
  return null;
}

function atLeast(version: ParsedVersion, bound: ParsedVersion, inclusive: boolean): boolean {
  const order = compareVersions(version, bound);
  return inclusive ? order >= 0 : order > 0;
}

function atMost(version: ParsedVersion, bound: ParsedVersion, inclusive: boolean): boolean {
  const order = compareVersions(version, bound);
  return inclusive ? order <= 0 : order < 0;
}

function bump(version: ParsedVersion, field: 'major' | 'minor' | 'patch'): ParsedVersion {
  if (field === 'major') return {major: version.major + 1, minor: 0, patch: 0, prerelease: []};
  if (field === 'minor') return {major: version.major, minor: version.minor + 1, patch: 0, prerelease: []};
  return {major: version.major, minor: version.minor, patch: version.patch + 1, prerelease: []};
}

/** Expand a partial version to concrete zeros for lower bounds. */
function core(partial: PartialVersion): {major: number; minor: number; patch: number} {
  return {major: partial.major ?? 0, minor: partial.minor ?? 0, patch: partial.patch ?? 0};
}

/** Split a comparator into its operator and parsed body. */
function readComparator(comparator: string): {operator: string; body: ComparatorBody} | null {
  if (comparator === '' || WILDCARD.test(comparator)) return null;
  const operator = /^(>=|<=|>|<|=|\^|~)/.exec(comparator)?.[1] ?? '';
  const body = parseComparatorBody(comparator.slice(operator.length));
  return body ? {operator, body} : null;
}

function comparatorMatches(version: ParsedVersion, comparator: string): boolean {
  if (comparator === '' || WILDCARD.test(comparator)) return true;
  const read = readComparator(comparator);
  if (!read) return false;
  const {operator, body: {partial, prerelease}} = read;
  const base: ParsedVersion = {...core(partial), prerelease};
  if (operator === '>=') return atLeast(version, base, true);
  if (operator === '>') { const last = lastSpecified(partial); return last ? atLeast(version, bump(base, last), true) : atLeast(version, base, false); }
  if (operator === '<=') { const last = lastSpecified(partial); return last ? atMost(version, bump(base, last), false) : atMost(version, base, true); }
  if (operator === '<') return atMost(version, base, false);
  if (operator === '^') {
    const upper = partial.major ? bump(base, 'major') : partial.minor ? bump(base, 'minor') : bump(base, 'patch');
    return atLeast(version, base, true) && atMost(version, upper, false);
  }
  if (operator === '~') {
    const upper = partial.major === null || partial.minor === null ? bump(base, 'major') : bump(base, 'minor');
    return atLeast(version, base, true) && atMost(version, upper, false);
  }
  if (partial.major !== null && version.major !== partial.major) return false;
  if (partial.minor !== null && version.minor !== partial.minor) return false;
  if (partial.patch !== null && version.patch !== partial.patch) return false;
  return prerelease.length ? compareVersions(version, base) === 0 : true;
}

/** Whether a comparator carries a prerelease on the version's exact core tuple. */
function comparatorGatesPrerelease(comparator: string, version: ParsedVersion): boolean {
  const read = readComparator(comparator);
  if (!read || !read.body.prerelease.length) return false;
  const {partial} = read.body;
  return partial.major === version.major && partial.minor === version.minor && partial.patch === version.patch;
}

/**
 * Test whether a concrete version satisfies a manifest range.
 * Prerelease versions only match an alternative that carries a prerelease on the
 * same core tuple, following the conventional semver rule.
 */
export function satisfiesVersion(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const trimmed = (range ?? '').trim();
  const alternatives = trimmed === '' || WILDCARD.test(trimmed) ? ['>=0.0.0'] : trimmed.split('||');
  return alternatives.some(alternative => {
    const comparators = alternative.trim().split(/\s+/).filter(Boolean);
    if (!comparators.length) return false;
    if (parsed.prerelease.length && !comparators.some(comparator => comparatorGatesPrerelease(comparator, parsed))) return false;
    return comparators.every(comparator => comparatorMatches(parsed, comparator));
  });
}
