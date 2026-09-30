// Metro must be told about the monorepo, or hoisted dependencies in the
// workspace-root node_modules will not resolve.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Left enabled (the Expo monorepo default is to disable it) so Metro can walk
// up to the hoisted workspace-root node_modules for transitive deps.

module.exports = withNativeWind(config, { input: './global.css' });
