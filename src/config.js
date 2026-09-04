import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadConfig() {
  const example = readJsonIfExists(path.join(rootDir, "config.example.json"));
  const local = readJsonIfExists(path.join(rootDir, "config.local.json"));
  const config = { ...example, ...local };

  config.host = config.host || "127.0.0.1";
  config.port = Number(config.port || 17321);
  config.samplesDir = path.resolve(rootDir, config.samplesDir || "samples");
  config.outputDir = path.resolve(config.outputDir || path.join(rootDir, "outputs"));
  config.quickerInstallDir = path.resolve(config.quickerInstallDir || "C:\\Program Files\\Quicker");
  const generationModes = new Set(["auto", "blocks", "csharp"]);
  config.generationMode = generationModes.has(String(config.generationMode || "auto").toLowerCase())
    ? String(config.generationMode || "auto").toLowerCase()
    : "auto";
  config.quickerSkillDir = path.resolve(
    config.quickerSkillDir || "C:\\Users\\Administrator\\.codex\\skills\\quicker-skill"
  );
  config.csharpBuildScript = path.resolve(
    config.csharpBuildScript || path.join(config.quickerSkillDir, "scripts", "build.ps1")
  );
  config.csharpBuildTimeoutMs = Number(config.csharpBuildTimeoutMs || 120000);
  config.apiKey = config.apiKey || process.env[config.apiKeyEnv || "OPENAI_API_KEY"] || "";

  return config;
}
