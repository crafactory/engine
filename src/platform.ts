/** Native identity comes from the bridge, never a mobile user-agent or narrow viewport. */
export function platformInfo(platform:'android'|'desktop'|'browser'='browser',tablet=false,os=''){
  const mobile=platform==='android';
  return {
    isMobile:mobile,isPhone:mobile&&!tablet,isTablet:mobile&&tablet,isDesktop:!mobile,
    isDesktopApp:platform==='desktop',isMobileApp:mobile,
    isMacOS:!mobile&&/Mac/i.test(os),isWin:!mobile&&/Win/i.test(os),isLinux:!mobile&&/Linux/i.test(os),
    isIos:false,isIosApp:false,isAndroid:mobile,isAndroidApp:mobile
  };
}
