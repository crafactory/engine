/* Validation for untrusted plugin package metadata.
 *
 * This runs before a package is offered to the loader: it checks ids, versions, engine
 * compatibility, entry paths, permission names and service declarations. It does not
 * execute code and it does not replace the kernel's manifest diagnostics at registration.
 */
import type {PluginManifest} from './kernel';
import {PLUGIN_PERMISSIONS} from './permissions';
import {parseVersion, satisfiesVersion} from './semver';

export type PackageIssueCode = 'manifest' | 'id' | 'name' | 'version' | 'engine' | 'entry' | 'permissions' | 'provides' | 'consumes';

export interface PackageIssue {code: PackageIssueCode; message: string}

export interface PackageValidation {ok: boolean; issues: PackageIssue[]}

export interface PluginPackageInput {manifest?: unknown; entry?: unknown}

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ENTRY = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+\.(?:js|mjs)$/;

/** Validate package metadata, optionally against the running engine version. */
export function validatePluginPackage(input: unknown, engineVersion?: string): PackageValidation {
  const issues: PackageIssue[] = [];
  const issue = (code: PackageIssueCode, message: string) => issues.push({code, message});
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {ok: false, issues: [{code: 'manifest', message: 'Package must be an object with a manifest'}]};
  }
  const {manifest, entry} = input as PluginPackageInput;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {ok: false, issues: [{code: 'manifest', message: 'Package manifest must be an object'}]};
  }
  const value = manifest as Partial<PluginManifest>;
  if (typeof value.id !== 'string' || !ID.test(value.id)) issue('id', 'Manifest id must be 1-64 lowercase letters, digits, dots, underscores or hyphens');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) issue('name', 'Manifest name must be 1-120 characters');
  if (typeof value.version !== 'string' || !parseVersion(value.version)) issue('version', 'Manifest version must be major.minor.patch');
  if (value.engine !== undefined) {
    if (typeof value.engine !== 'string' || !value.engine.trim()) issue('engine', 'Manifest engine must be a version range');
    else if (engineVersion && !satisfiesVersion(engineVersion, value.engine)) issue('engine', `Package requires engine ${value.engine}`);
  }
  if (entry !== undefined && (typeof entry !== 'string' || !ENTRY.test(entry))) issue('entry', 'Package entry must be a relative .js or .mjs path');
  if (value.permissions !== undefined) {
    if (!Array.isArray(value.permissions)) issue('permissions', 'Manifest permissions must be an array');
    else {
      const seen = new Set<string>();
      for (const permission of value.permissions) {
        if (typeof permission !== 'string' || !(PLUGIN_PERMISSIONS as readonly string[]).includes(permission)) issue('permissions', `Unknown permission ${String(permission)}`);
        else if (seen.has(permission)) issue('permissions', `Duplicate permission ${permission}`);
        seen.add(permission);
      }
    }
  }
  if (value.provides !== undefined) {
    if (!Array.isArray(value.provides)) issue('provides', 'Manifest provides must be an array');
    else for (const provision of value.provides) {
      if (!provision || typeof provision !== 'object' || typeof provision.contract !== 'string' || !provision.contract.trim()) issue('provides', 'Each provision needs a contract');
      else if (typeof provision.version !== 'string' || !parseVersion(provision.version)) issue('provides', `Provision ${provision.contract} needs a major.minor.patch version`);
    }
  }
  if (value.consumes !== undefined) {
    if (!Array.isArray(value.consumes)) issue('consumes', 'Manifest consumes must be an array');
    else for (const requirement of value.consumes) {
      if (!requirement || typeof requirement !== 'object' || typeof requirement.contract !== 'string' || !requirement.contract.trim()) issue('consumes', 'Each requirement needs a contract');
      else if (requirement.range !== undefined && (typeof requirement.range !== 'string' || !requirement.range.trim())) issue('consumes', `Requirement ${requirement.contract} has an invalid range`);
      else if (requirement.optional !== undefined && typeof requirement.optional !== 'boolean') issue('consumes', `Requirement ${requirement.contract} has an invalid optional flag`);
    }
  }
  return {ok: issues.length === 0, issues};
}
