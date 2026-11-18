const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Block macOS AppleDouble "._*" resource-fork sidecar files generated on external volumes (T7 Shield)
config.resolver.blockList = [/(^|\/)\._[^/]+$/];

module.exports = withNativeWind(config, { input: "./global.css" });
