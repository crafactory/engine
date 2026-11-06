import {describe,it,expect} from 'vitest';
import {imeInputViewVisible} from '../scripts/android-ime-state.mjs';

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
