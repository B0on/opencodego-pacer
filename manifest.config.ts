import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "OpenCode Go Pacer",
  version: "0.1.0",
  description:
    "Paces your OpenCode Go subscription usage against its weekly reset window.",
  permissions: ["storage", "cookies", "alarms", "offscreen", "tabs"],
  host_permissions: ["https://opencode.ai/*"],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_title: "OpenCode Go Pacer",
  },
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
});
