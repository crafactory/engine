import {describe,it,expect,vi} from 'vitest';
import {AudioRecorder, audioRecorderPlugin, createAudioRecorderRuntime, AUDIO_RECORDER_CONTRACT, type AudioRecorderService} from '../src/services';
import {Kernel} from '../src/kernel';

function environment(mimeType = 'audio/webm') {
  const track = {stop: vi.fn()};
  const stream = {getTracks: () => [track]};
  const blob = new Blob([new Uint8Array([1, 2, 3])], {type: mimeType});
  const recorder = {
    mimeType,
    ondataavailable: null as ((event: {data: Blob}) => void) | null,
    onstop: null as (() => void) | null,
    start() { this.ondataavailable?.({data: blob}); },
    stop() { this.onstop?.(); }
  };
  return {track, stream, recorder, deps: {getStream: async () => stream, createRecorder: () => recorder}};
}

describe('audio recorder service', () => {
  it('collects chunks, stops tracks and reports the recording', async () => {
    const env = environment();
    const recorder = new AudioRecorder(env.deps);
    expect(recorder.isRecording()).toBe(false);
    await recorder.start();
    expect(recorder.isRecording()).toBe(true);
    await recorder.start();
    expect(recorder.isRecording()).toBe(true);
    const result = await recorder.stop();
    expect(result).toEqual({data: [1, 2, 3], mimeType: 'audio/webm', extension: '.webm'});
    expect(recorder.isRecording()).toBe(false);
    expect(env.track.stop).toHaveBeenCalledTimes(1);
    await expect(recorder.stop()).rejects.toThrow('Not recording');
  });
  it('uses an .ogg extension when the recorder reports Ogg', async () => {
    const env = environment('audio/ogg');
    const recorder = new AudioRecorder(env.deps);
    await recorder.start();
    expect((await recorder.stop()).extension).toBe('.ogg');
  });
  it('stops the stream when recorder creation fails', async () => {
    const env = environment();
    const recorder = new AudioRecorder({...env.deps, createRecorder: () => { throw new Error('boom'); }});
    await expect(recorder.start()).rejects.toThrow('boom');
    expect(env.track.stop).toHaveBeenCalledTimes(1);
    expect(recorder.isRecording()).toBe(false);
  });
  it('shares one pending start during the permission prompt', async () => {
    let release!: (stream: {getTracks: () => {stop: () => void}[]}) => void;
    const track = {stop: vi.fn()};
    const stream = {getTracks: () => [track]};
    const blob = new Blob([new Uint8Array([1])], {type: 'audio/webm'});
    let created = 0;
    const fake = {mimeType: 'audio/webm', ondataavailable: null as any, onstop: null as any, start() { this.ondataavailable?.({data: blob}); }, stop() { this.onstop?.(); }};
    const recorder = new AudioRecorder({getStream: () => new Promise(resolve => { release = resolve; }), createRecorder: () => { created++; return fake; }});
    const first = recorder.start(), second = recorder.start();
    expect(second).toBe(first);
    release(stream);
    await Promise.all([first, second]);
    expect(created).toBe(1);
    expect(recorder.isRecording()).toBe(true);
    await recorder.stop();
  });
  it('releases a stream acquired after disposal and rejects the pending start', async () => {
    let release!: (stream: {getTracks: () => {stop: () => void}[]}) => void;
    const track = {stop: vi.fn()};
    const stream = {getTracks: () => [track]};
    let created = 0;
    const service = new AudioRecorder({getStream: () => new Promise(resolve => { release = resolve; }), createRecorder: () => { created++; throw new Error('should not be created'); }});
    const starting = service.start();
    await service.dispose();
    release(stream);
    await expect(starting).rejects.toThrow('disposed');
    expect(created).toBe(0);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(service.isRecording()).toBe(false);
  });
  it('keeps the stopped recording state when a new recording starts before onstop fires', async () => {
    const firstTrack = {stop: vi.fn()}, secondTrack = {stop: vi.fn()};
    const firstStream = {getTracks: () => [firstTrack]}, secondStream = {getTracks: () => [secondTrack]};
    let current: {getTracks: () => {stop: () => void}[]} = firstStream;
    const stopHolder: {fn: (() => void) | null} = {fn: null};
    let recorder: any;
    const makeRecorder = (data: number) => ({
      mimeType: 'audio/webm', ondataavailable: null as any, onstop: null as any,
      start() { this.ondataavailable?.({data: new Blob([new Uint8Array([data])], {type: 'audio/webm'})}); },
      stop() { stopHolder.fn = this.onstop; }
    });
    const service = new AudioRecorder({
      getStream: async () => current,
      createRecorder: () => { recorder = makeRecorder(current === firstStream ? 1 : 2); return recorder; }
    });
    await service.start();
    const stopping = service.stop();
    current = secondStream;
    await service.start();
    const oldStop = stopHolder.fn;
    stopHolder.fn = null;
    oldStop?.();
    expect(await stopping).toEqual({data: [1], mimeType: 'audio/webm', extension: '.webm'});
    expect(firstTrack.stop).toHaveBeenCalledTimes(1);
    expect(secondTrack.stop).not.toHaveBeenCalled();
    await service.dispose();
    expect(secondTrack.stop).toHaveBeenCalledTimes(1);
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const env = environment();
    const runtime = await createAudioRecorderRuntime({deps: env.deps});
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(AUDIO_RECORDER_CONTRACT).ok).toBe(true);
    let recording = true;
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(audioRecorderPlugin(new AudioRecorder(env.deps)));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: AUDIO_RECORDER_CONTRACT}]}, setup(context) { recording = context.service<AudioRecorderService>(AUDIO_RECORDER_CONTRACT).isRecording(); }});
    await kernel.start();
    expect(recording).toBe(false);
  });
});
