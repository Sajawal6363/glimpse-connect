/**
 * CallFloatingWidget — no longer needed because WebRTC peer connections
 * cannot survive React component unmount / navigation. Calls now properly
 * end when the user navigates away, and both sides clean up.
 *
 * Kept as a no-op so existing imports in App.tsx don't break.
 */
const CallFloatingWidget = () => null;

export default CallFloatingWidget;
