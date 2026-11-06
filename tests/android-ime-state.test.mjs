import {describe,it,expect} from 'vitest';
import {imeInputViewVisible,launcherAnrVisible} from '../scripts/android-ime-state.mjs';

describe('Android input-view diagnostic, not show-request history',()=>{
  it('accepts a currently visible bound input view',()=>{
    expect(imeInputViewVisible('  mInputShown=true\n  mWindowVisible=true\n  mIsInputViewShown=true mStatusIcon=0\n')).toBe(true);
  });
  it('does not confuse a retained request flag with a visible input view',()=>{
    expect(imeInputViewVisible('  mInputShown=true\n  mWindowVisible=true\n  mIsInputViewShown=false mStatusIcon=0\n')).toBe(false);
  });
  it('requires a visible window even if its retained input view is internally shown',()=>{
    expect(imeInputViewVisible(' mWindowVisible=false\n mIsInputViewShown=true')).toBe(false);
  });
  it('supports the public non-member-prefixed diagnostic spelling',()=>{
    expect(imeInputViewVisible(' mWindowVisible=true\n isInputViewShown=true\n')).toBe(true);
  });
  it('refuses missing or ambiguous diagnostics instead of assuming hidden',()=>{
    expect(()=>imeInputViewVisible('mInputShown=false')).toThrow('Expected one');
    expect(()=>imeInputViewVisible('mWindowVisible=true\nmIsInputViewShown=false\nisInputViewShown=true')).toThrow('Expected one');
    expect(()=>imeInputViewVisible('mIsInputViewShown=false')).toThrow('Expected one');
  });
});

describe('bounded emulator system-launcher recovery',()=>{
  const window=(name,visible)=>`  Window #6 Window{47db87e u0 Application Not Responding: ${name}}:\n    isVisible=${visible}\n`;
  it('recognizes only the exact visible Pixel Launcher ANR window',()=>{
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher',true))).toBe(true);
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher',false))).toBe(false);
  });
  it('never recovers an app ANR or similarly named package',()=>{
    expect(launcherAnrVisible(window('com.crafactory.engine',true))).toBe(false);
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher.other',true))).toBe(false);
    expect(launcherAnrVisible('ANR in com.google.android.apps.nexuslauncher')).toBe(false);
  });
  it('does not borrow another window visibility to accept a hidden ANR',()=>{
    expect(launcherAnrVisible(window('com.google.android.apps.nexuslauncher',false)+window('com.crafactory.engine',true))).toBe(false);
  });
});
