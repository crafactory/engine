import {describe,it,expect} from 'vitest';
import {SlashCommands, slashCommandsPlugin, createSlashCommandsRuntime, SLASH_COMMANDS_CONTRACT, type SlashCommandsService} from '../src/services';
import {Kernel} from '../src/kernel';

describe('slash commands service', () => {
  it('lists the built-in structural insertions with template as an action', () => {
    const commands = new SlashCommands().list();
    expect(commands.map(command => command.id)).toEqual(['heading', 'task', 'callout', 'table', 'code', 'template']);
    expect(commands.find(command => command.id === 'heading')?.insert).toBe('# ');
    expect(commands.find(command => command.id === 'template')).toMatchObject({detail: 'Insert template', action: 'insert-template'});
    expect(commands.find(command => command.id === 'template')?.insert).toBeUndefined();
  });
  it('returns copies so callers cannot mutate the built-in list', () => {
    const commands = new SlashCommands().list();
    commands[0].label = 'mutated';
    expect(new SlashCommands().list()[0].label).toBe('/heading');
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const runtime = await createSlashCommandsRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(SLASH_COMMANDS_CONTRACT).ok).toBe(true);
    expect(runtime.service.list()).toHaveLength(6);
    let count = 0;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(slashCommandsPlugin(new SlashCommands()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: SLASH_COMMANDS_CONTRACT}]}, setup(context) { count = context.service<SlashCommandsService>(SLASH_COMMANDS_CONTRACT).list().length; }});
    await kernel.start();
    expect(count).toBe(6);
  });
});
