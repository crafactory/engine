import { describe, it, expect, vi } from 'vitest';
import { platformInfo } from '../src/platform';
import { createCompatibilityRuntime } from '../src/compat-core';
import { createCompatService } from '../src/compat/service';
import type { CompatHost } from '../src/services/compat';
import capacitorConfig from '../capacitor.config';

const manifest = { id: 'original-mobile-probe', name: 'Original mobile probe', version: '1.0.0' };
describe('native mobile identity, not viewport/user-agent spoofing', () => {
  it('uses native safe-area handling with the same initial cover viewport', () => {
    expect(capacitorConfig.plugins?.SystemBars).toMatchObject({
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    });
  });
  it('exports Android identity without desktop/Node identity', () => {
    expect(platformInfo('android', false, 'Linux armv8')).toMatchObject({
      isMobile: true,
      isMobileApp: true,
      isAndroid: true,
      isAndroidApp: true,
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      isDesktopApp: false,
      isLinux: false,
      isIosApp: false,
    });
    expect(platformInfo('android', true).isTablet).toBe(true);
    expect(platformInfo('browser', true, 'Linux x86_64')).toMatchObject({
      isMobile: false,
      isTablet: false,
      isDesktopApp: false,
      isLinux: true,
    });
  });
  it('makes mobile flags available to worker and renderer core consumers', async () => {
    const runtime = createCompatibilityRuntime(
      manifest,
      { name: 'Native', entries: [], notes: [], active: '', editor: null, platform: 'android' },
      {
        request: async () => null,
        commands: () => {},
        notice: () => {},
      },
    );
    expect(runtime.app.isMobile).toBe(true);
    expect((runtime.api as any).Platform.isAndroidApp).toBe(true);
    expect((runtime.api as any).Platform.isDesktopApp).toBe(false);
    await runtime.stop();
  });
  it('refuses desktop-only packages before either runtime starts on Android', () => {
    const controller = { ready: Promise.resolve(), sync: () => {}, stop: async () => {} },
      worker = vi.fn(() => controller),
      renderer = vi.fn(() => controller);
    const service = createCompatService({ worker, renderer }),
      pkg = { manifest: { ...manifest, isDesktopOnly: true }, code: 'original fixture' };
    const callbacks = {
      snapshot: () => ({
        name: 'Native',
        entries: [],
        notes: [],
        active: '',
        editor: null,
        platform: 'android' as const,
      }),
      commands: () => {},
      notice: () => {},
      failure: () => {},
      host: {} as CompatHost,
    };
    for (const mode of ['worker', 'renderer'] as const)
      expect(() => service.start({ package: pkg, mode, callbacks })).toThrow(
        'Desktop-only plugin is unavailable on Android',
      );
    expect(worker).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
    service.start({
      package: pkg,
      mode: 'worker',
      callbacks: {
        ...callbacks,
        snapshot: () => ({ ...callbacks.snapshot(), platform: 'desktop' }),
      },
    });
    expect(worker).toHaveBeenCalledOnce();
  });
});
