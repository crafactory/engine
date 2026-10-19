/* Native commands service contract (`engine.commands/v1`).
 * The UI, the Obsidian compatibility layer and headless tests share one registry. */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const COMMANDS_CONTRACT = 'engine.commands/v1';
export const COMMANDS_VERSION = '1.0.0';

export interface CommandContext {open?(path: string): void}
export interface NativeCommand {id: string; name: string; run: (context?: CommandContext) => unknown; check?: (context?: CommandContext) => boolean; hotkey?: string}

/** A registry of named commands with optional availability checks and reserved hotkeys. */
export interface CommandsService {
  register(command: NativeCommand): () => void;
  unregister(id: string): void;
  list(): NativeCommand[];
  run(id: string, context?: CommandContext): Promise<unknown>;
  hotkeys(): Record<string, string>;
}

/** Original command registry with deterministic ordering and availability checks. */
export class CommandRegistry implements CommandsService {
  private readonly commands = new Map<string, NativeCommand>();
  private readonly owners = new Map<string, symbol>();

  /** Add a command, refusing duplicate ids and malformed definitions. */
  register(command: NativeCommand): () => void {
    if (!command || typeof command.id !== 'string' || !command.id || typeof command.name !== 'string' || !command.name || typeof command.run !== 'function') throw new Error('Invalid command');
    if (this.commands.has(command.id)) throw new Error('Command already registered: ' + command.id);
    const owner = Symbol(command.id);
    this.commands.set(command.id, command);
    this.owners.set(command.id, owner);
    return () => {
      if (this.owners.get(command.id) !== owner) return;
      this.commands.delete(command.id);
      this.owners.delete(command.id);
    };
  }

  /** Remove a command by id, invalidating any outstanding disposer for it. */
  unregister(id: string): void { this.commands.delete(id); this.owners.delete(id); }

  /** List commands in registration order. */
  list(): NativeCommand[] { return [...this.commands.values()]; }

  /** Run a command after its availability check, awaiting asynchronous results. */
  async run(id: string, context?: CommandContext): Promise<unknown> {
    const command = this.commands.get(id);
    if (!command) throw new Error('Command not found: ' + id);
    if (command.check && !command.check(context)) throw new Error('Command unavailable: ' + id);
    return command.run(context);
  }

  /** Map reserved hotkey combinations to command ids. */
  hotkeys(): Record<string, string> {
    const bindings: Record<string, string> = {};
    for (const command of this.commands.values()) if (command.hotkey) bindings[command.hotkey] = command.id;
    return bindings;
  }
}

/** Wrap a commands service as a runtime-scoped native plugin. */
export function commandsPlugin(service: CommandsService): PluginDefinition {
  return {
    manifest: {id: 'engine.commands', name: 'Commands', version: COMMANDS_VERSION, scopes: ['runtime'], provides: [{contract: COMMANDS_CONTRACT, version: COMMANDS_VERSION}]},
    setup(context) { context.provide(COMMANDS_CONTRACT, COMMANDS_VERSION, service); }
  };
}

/** Default runtime-scoped commands provider plugin. */
export const createCommandsPlugin = (): PluginDefinition => commandsPlugin(new CommandRegistry());

export interface CommandsRuntime {kernel: Kernel; service: CommandsService}

/** Build and start a kernel exposing the commands service. */
export async function createCommandsRuntime(options: {engineVersion?: string} = {}): Promise<CommandsRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(createCommandsPlugin());
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(COMMANDS_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Commands service was not provided');
  return {kernel, service: resolved.binding.value as CommandsService};
}
