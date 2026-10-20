/* Native audio-recorder service contract (`engine.audio-recorder/v1`).
 *
 * Wraps the browser MediaRecorder lifecycle (stream acquisition, chunk collection and
 * stop) so the application only decides where to attach the recording. Stream and recorder
 * factories are injectable for tests.
 */
import {Kernel, type PluginDefinition} from '../kernel';
import {ENGINE_VERSION} from './version';

export const AUDIO_RECORDER_CONTRACT = 'engine.audio-recorder/v1';
export const AUDIO_RECORDER_VERSION = '1.0.0';

export interface RecorderTrack {stop(): void}
export interface RecorderStream {getTracks(): RecorderTrack[]}
export interface RecorderLike {
  mimeType: string;
  ondataavailable: ((event: {data: Blob}) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
}
export interface AudioRecording {data: number[]; mimeType: string; extension: string}
export interface AudioRecorderDeps {
  getStream?: () => Promise<RecorderStream>;
  createRecorder?: (stream: RecorderStream) => RecorderLike;
}

/** Start and stop one audio recording. */
export interface AudioRecorderService {
  start(): Promise<void>;
  stop(): Promise<AudioRecording>;
  isRecording(): boolean;
}

/** Original MediaRecorder lifecycle. */
export class AudioRecorder implements AudioRecorderService {
  private recorder?: RecorderLike;
  private stream?: RecorderStream;
  private chunks: Blob[] = [];

  /** @param deps Optional stream/recorder factories for tests or alternate hosts. */
  constructor(private readonly deps: AudioRecorderDeps = {}) {}

  /** Whether a recording is in progress. */
  isRecording(): boolean { return !!this.recorder; }

  /** Acquire a stream and begin recording. Repeating while recording is a no-op. */
  async start(): Promise<void> {
    if (this.recorder) return;
    const getStream = this.deps.getStream ?? defaultGetStream;
    const createRecorder = this.deps.createRecorder ?? defaultCreateRecorder;
    const stream = await getStream();
    let recorder: RecorderLike;
    try { recorder = createRecorder(stream); }
    catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
    this.stream = stream;
    this.recorder = recorder;
    this.chunks = [];
    recorder.ondataavailable = event => { if (event.data && event.data.size) this.chunks.push(event.data); };
    try { recorder.start(); }
    catch (error) { this.recorder = undefined; this.stream = undefined; stream.getTracks().forEach(track => track.stop()); throw error; }
  }

  /** Stop recording and return the bytes plus a filename extension. */
  stop(): Promise<AudioRecording> {
    const recorder = this.recorder;
    if (!recorder) return Promise.reject(new Error('Not recording'));
    this.recorder = undefined;
    return new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = undefined;
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(this.chunks, {type: mimeType});
          resolve({data: Array.from(new Uint8Array(await blob.arrayBuffer())), mimeType, extension: /ogg/.test(mimeType) ? '.ogg' : '.webm'});
        } catch (error) { reject(error); }
      };
      try { recorder.stop(); } catch (error) { reject(error); }
    });
  }
}

/** Browser stream factory. */
function defaultGetStream(): Promise<RecorderStream> {
  return navigator.mediaDevices.getUserMedia({audio: true}) as unknown as Promise<RecorderStream>;
}

/** Browser recorder factory. */
function defaultCreateRecorder(stream: RecorderStream): RecorderLike {
  return new MediaRecorder(stream as unknown as MediaStream) as unknown as RecorderLike;
}

/** Wrap an audio-recorder service as a runtime-scoped native plugin. */
export function audioRecorderPlugin(service: AudioRecorderService): PluginDefinition {
  return {
    manifest: {id: 'engine.audio-recorder', name: 'Audio recorder', version: AUDIO_RECORDER_VERSION, scopes: ['runtime'], provides: [{contract: AUDIO_RECORDER_CONTRACT, version: AUDIO_RECORDER_VERSION}]},
    setup(context) { context.provide(AUDIO_RECORDER_CONTRACT, AUDIO_RECORDER_VERSION, service); }
  };
}

export interface AudioRecorderRuntime {kernel: Kernel; service: AudioRecorderService}

/** Build and start a kernel exposing the audio-recorder service. */
export async function createAudioRecorderRuntime(options: {engineVersion?: string; deps?: AudioRecorderDeps} = {}): Promise<AudioRecorderRuntime> {
  const kernel = new Kernel({engineVersion: options.engineVersion ?? ENGINE_VERSION});
  kernel.register(audioRecorderPlugin(new AudioRecorder(options.deps)));
  await kernel.start();
  const resolved = kernel.runtime.services.resolve(AUDIO_RECORDER_CONTRACT, '^1.0.0');
  if (!resolved.ok) throw new Error('Audio recorder service was not provided');
  return {kernel, service: resolved.binding.value as AudioRecorderService};
}
