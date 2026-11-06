// Original parser for the current bound InputMethodService's actual view state.
// mInputShown is a server request flag and is not a visible-window assertion.
export function imeInputViewVisible(dump){
  const values=[...dump.matchAll(/^\s*(?:mIsInputViewShown|isInputViewShown)=(true|false)\b/gm)].map(match=>match[1]);
  const windows=[...dump.matchAll(/\bmWindowVisible=(true|false)\b/g)].map(match=>match[1]);
  if(values.length!==1||windows.length!==1)throw new Error('Expected one bound Android input-view and window visibility diagnostic');
  return values[0]==='true'&&windows[0]==='true';
}

/** Only the observed, currently visible Pixel Launcher system ANR is recoverable.
 * Never classify the application, another package, or a historical hidden window. */
export function launcherAnrVisible(dump){
  return dump.split(/(?=^\s*Window #\d+ Window\{)/m).some(block=>
    /^\s*Window #\d+ Window\{[^\n]* Application Not Responding: com\.google\.android\.apps\.nexuslauncher\}:\s*$/m.test(block)&&
    /^\s*isVisible=true\s*$/m.test(block));
}
