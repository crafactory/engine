// Original parser for the current bound InputMethodService's actual view state.
// mInputShown is a server request flag and is not a visible-window assertion.
export function imeInputViewVisible(dump){
  const values=[...dump.matchAll(/^\s*(?:mIsInputViewShown|isInputViewShown)=(true|false)\b/gm)].map(match=>match[1]);
  const windows=[...dump.matchAll(/\bmWindowVisible=(true|false)\b/g)].map(match=>match[1]);
  if(values.length!==1||windows.length!==1)throw new Error('Expected one bound Android input-view and window visibility diagnostic');
  return values[0]==='true'&&windows[0]==='true';
}
