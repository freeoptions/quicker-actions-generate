import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

let cachedIcons = null;

function getCandidateDllPaths(config = {}) {
  const candidates = [];
  const addDir = (dir) => {
    if (!dir) {
      return;
    }
    candidates.push(path.join(dir, "FontAwesomeIconsWpf.dll"));
  };

  addDir(config.quickerInstallDir);
  addDir(process.env.QUICKER_INSTALL_DIR);
  addDir("C:\\Program Files\\Quicker");
  addDir("C:\\Program Files (x86)\\Quicker");

  return candidates;
}

function resolveIconDllPath(config = {}) {
  for (const filePath of getCandidateDllPaths(config)) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error("未找到 Quicker 的 FontAwesomeIconsWpf.dll，请在 config.local.json 中设置 quickerInstallDir");
}

function loadBuiltinIcons(config = {}) {
  if (cachedIcons) {
    return cachedIcons;
  }

  const dllPath = resolveIconDllPath(config);
  const script = [
    `$asm = [Reflection.Assembly]::LoadFrom('${dllPath.replace(/'/g, "''")}');`,
    `$iconType = $asm.GetType('FontAwesome5.EFontAwesomeIcon');`,
    `[Enum]::GetNames($iconType)`,
    `| Where-Object { $_ -ne 'None' }`,
    `| ForEach-Object { "fa:$($_)" }`
  ].join(" ");

  const output = execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ], {
    encoding: "utf8",
    windowsHide: true
  });

  cachedIcons = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!cachedIcons.length) {
    throw new Error("Quicker 内置图标库为空");
  }

  return cachedIcons;
}

export function chooseRandomBuiltinIcon(config = {}) {
  const pool = loadBuiltinIcons(config);
  return pool[crypto.randomInt(pool.length)];
}
