import Constants from "expo-constants";

export const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return "http://localhost:8081";
  }
  // LAN dev host looks like "192.168.1.5:8081" (has a port).
  // Tunnel hosts (e.g. "xxx.exp.direct") have no port and are HTTPS-only.
  if (hostUri.includes(":")) {
    return `http://${hostUri}`;
  }
  return `https://${hostUri}`;
};