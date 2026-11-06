// Original parser for the current bound InputMethodService's actual view state.
// mInputShown is a server request flag and is not a visible-window assertion.
export function imeInputViewVisible(dump){
  const values=[...dump.matchAll(/^\s*(?:mIsInputViewShown|isInputViewShown)=(true|false)\b/gm)].map(match=>match[1]);
  if(values.length!==1)throw new Error('Expected one bound Android input-view visibility diagnostic');
  return values[0]==='true';
}
