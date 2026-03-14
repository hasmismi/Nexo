const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub out ExpoCryptoAES which requires a native module not present in Expo Go.
  // Safe because PKCE is disabled (usePKCE: false) so this code is never invoked.
  if (
    moduleName.includes("ExpoCryptoAES") &&
    context.originModulePath &&
    context.originModulePath.includes("expo-crypto") &&
    platform !== "web"
  ) {
    return {
      filePath: path.resolve(__dirname, "stubs/ExpoCryptoAES.js"),
      type: "sourceFile",
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
