// Metro config wiring NativeWind v4 (Story 2.1).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// @caraoke/shared (a workspace TS package) is authored with NodeNext ESM imports that carry
// explicit `.js` extensions on `.ts` source files — required for the Node API build, but Metro
// bundles the .ts source and doesn't map `.js` → `.ts`. Rewrite relative `.js` specifiers to
// extensionless so Metro's sourceExts (ts/tsx/js) resolve them; fall back to the original for
// real .js files. Delegates to any upstream resolver (e.g. NativeWind's).
const nwConfig = withNativeWind(config, { input: './global.css' });
const upstreamResolveRequest = nwConfig.resolver.resolveRequest;

nwConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if ((moduleName.startsWith('./') || moduleName.startsWith('../')) && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.slice(0, -'.js'.length), platform);
    } catch {
      // Not a .ts-backed import — fall through and resolve the literal .js path.
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = nwConfig;
