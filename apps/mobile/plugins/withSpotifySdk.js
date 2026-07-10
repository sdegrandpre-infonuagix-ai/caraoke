// Local wrapper for @wwdrew/expo-spotify-sdk's Expo config plugin.
//
// The package's package.json "exports" only exposes "." and "./plugin" — it does NOT expose
// app.plugin.js, and its main export (build/index.js) has an ESM directory-import bug. So under
// pnpm's strict resolution, Expo can't resolve the plugin by package name (app.plugin.js is
// hidden) and falls back to the broken main → "Unable to resolve a valid config plugin".
//
// Anchor off the "./plugin" subpath (which IS exported) to locate the package on disk, then
// require the real plugin mod function by ABSOLUTE path — absolute requires bypass the "exports"
// gate (package.json itself is also blocked by this package's exports). Expo calls the result as
// a normal config plugin: (config, { clientID, scheme, host }) => config.
const path = require('path');

// .../@wwdrew/expo-spotify-sdk/plugin/index.js  →  dir  .../plugin
const pluginDir = path.dirname(require.resolve('@wwdrew/expo-spotify-sdk/plugin'));
module.exports = require(path.join(pluginDir, 'build', 'withSpotifySdkConfig.js'));
