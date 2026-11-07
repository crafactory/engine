import { describe, it, expect } from 'vitest';
import {
  imeInputViewVisible,
  launcherAnrVisible,
  imeCompositionReady,
} from '../scripts/android-ime-state.mjs';

describe('Android input-view diagnostic, not show-request history', () => {
  it('accepts a currently visible bound input view', () => {
    expect(
      imeInputViewVisible(
        '  mInputShown=true\n  mWindowVisible=true\n  mIsInputViewShown=true mStatusIcon=0\n',
      ),
    ).toBe(true);
  });
  it('does not confuse a retained request flag with a visible input view', () => {
    expect(
      imeInputViewVisible(
        '  mInputShown=true\n  mWindowVisible=true\n  mIsInputViewShown=false mStatusIcon=0\n',
      ),
    ).toBe(false);
  });
  it('requires a visible window even if its retained input view is internally shown', () => {
    expect(imeInputViewVisible(' mWindowVisible=false\n mIsInputViewShown=true')).toBe(false);
  });
  it('supports the public non-member-prefixed diagnostic spelling', () => {
    expect(imeInputViewVisible(' mWindowVisible=true\n isInputViewShown=true\n')).toBe(true);
  });
  it('refuses missing or ambiguous diagnostics instead of assuming hidden', () => {
    expect(() => imeInputViewVisible('mInputShown=false')).toThrow('Expected one');
    expect(() =>
      imeInputViewVisible('mWindowVisible=true\nmIsInputViewShown=false\nisInputViewShown=true'),
    ).toThrow('Expected one');
    expect(() => imeInputViewVisible('mIsInputViewShown=false')).toThrow('Expected one');
  });
});

describe('bounded emulator system-launcher recovery', () => {
  const window = (name, visible) =>
    `  Window #6 Window{47db87e u0 Application Not Responding: ${name}}:\n    isVisible=${visible}\n`;
  it('recognizes only the exact visible Pixel Launcher ANR window', () => {
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher', true))).toBe(true);
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher', false))).toBe(false);
  });
  it('never recovers an app ANR or similarly named package', () => {
    expect(launcherAnrVisible(window('com.crafactory.engine', true))).toBe(false);
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher.other', true))).toBe(
      false,
    );
    expect(launcherAnrVisible('ANR in com.google.android.apps.nexuslauncher')).toBe(false);
  });
  it('does not borrow another window visibility to accept a hidden ANR', () => {
    expect(
      launcherAnrVisible(
        window('com.google.android.apps.nexuslauncher', false) +
          window('com.crafactory.engine', true),
      ),
    ).toBe(false);
  });
});

describe('native composition editor readiness', () => {
  const active = `Input method service state for com.crafactory.engine.CompositionIme@abc:
  mWindowVisible=true
  mIsInputViewShown=true
  mStartedInputConnection=RemoteInputConnection{idHash=#e069686}
  mInputStarted=true mInputViewStarted=true mCandidatesViewStarted=false
  mInputEditorInfo:
    inputType=0x200a1 imeOptions=0x12000001
    packageName=com.crafactory.engine fieldId=1
`;
  it('requires an active visible text editor, not the non-null fallback connection', () => {
    expect(imeCompositionReady(active)).toBe(true);
    expect(imeCompositionReady(active.replace('0x200a1', '0x0'))).toBe(false);
    expect(
      imeCompositionReady(active.replace('RemoteInputConnection{idHash=#e069686}', 'null')),
    ).toBe(false);
    expect(imeCompositionReady(active.replace('mIsInputViewShown=true', ''))).toBe(false);
  });
  it('rejects hidden, unstarted and other-package editors', () => {
    for (const [before, after] of [
      ['mWindowVisible=true', 'mWindowVisible=false'],
      ['mInputViewStarted=true', 'mInputViewStarted=false'],
      ['packageName=com.crafactory.engine', 'packageName=another.app'],
    ]) {
      expect(imeCompositionReady(active.replace(before, after))).toBe(false);
    }
  });
  it('never borrows connection state from another service or its historical dump', () => {
    expect(imeCompositionReady(active.replace('CompositionIme@abc', 'AnotherIme@abc'))).toBe(false);
    expect(
      imeCompositionReady(
        active.replace('0x200a1', '0x0') + '\nOther state:\n  inputType=0x200a1\n',
      ),
    ).toBe(false);
  });
});
