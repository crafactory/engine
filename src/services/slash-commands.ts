/* Native slash-commands service contract (`engine.slash-commands/v1`).
 *
 * Provides the structural insertions offered when the user types `/` in the editor. The
 * editor owns the completion widget and the template action callback.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const SLASH_COMMANDS_CONTRACT = 'engine.slash-commands/v1';
export const SLASH_COMMANDS_VERSION = '1.0.0';

export interface SlashCommand {
  id: string;
  label: string;
  detail: string;
  /** Text inserted at the completion range. */
  insert?: string;
  /** When set, the editor invokes this action instead of inserting text. */
  action?: 'insert-template';
}

/** List the available slash insertions. */
export interface SlashCommandsService {
  list(): SlashCommand[];
}

/** Built-in structural insertions. */
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  {id: 'heading', label: '/heading', detail: 'Heading', insert: '# '},
  {id: 'task', label: '/task', detail: 'Task', insert: '- [ ] '},
  {id: 'callout', label: '/callout', detail: 'Callout', insert: '> [!note] Note\n> '},
  {id: 'table', label: '/table', detail: 'Table', insert: '| Column | Column |\n| --- | --- |\n|  |  |'},
  {id: 'code', label: '/code', detail: 'Code block', insert: '```\n\n```'},
  {id: 'template', label: '/template', detail: 'Insert template', action: 'insert-template'}
];

/** Original static slash-command list. */
export class SlashCommands implements SlashCommandsService {
  /** Return a copy of the built-in insertions. */
  list(): SlashCommand[] { return DEFAULT_SLASH_COMMANDS.map(command => ({...command})); }
}

/** Wrap a slash-commands service as a runtime-scoped native plugin. */
export function slashCommandsPlugin(service: SlashCommandsService): PluginDefinition {
  return {
    manifest: {id: 'engine.slash-commands', name: 'Slash commands', version: SLASH_COMMANDS_VERSION, scopes: ['runtime'], provides: [{contract: SLASH_COMMANDS_CONTRACT, version: SLASH_COMMANDS_VERSION}]},
    setup(context) { context.provide(SLASH_COMMANDS_CONTRACT, SLASH_COMMANDS_VERSION, service); }
  };
}

export interface SlashCommandsRuntime {kernel: Kernel; service: SlashCommandsService}

/** Build and start a kernel exposing the slash-commands service. */
export async function createSlashCommandsRuntime(options: {engineVersion?: string} = {}): Promise<SlashCommandsRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(slashCommandsPlugin(new SlashCommands()));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(SLASH_COMMANDS_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Slash commands service was not provided');
  return {kernel, service: resolved.binding.value as SlashCommandsService};
}
