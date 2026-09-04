import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig, rootDir } from "./config.js";
import { planWithModel } from "./model.js";
import { buildAction } from "./builder.js";
import { chooseRandomBuiltinIcon } from "./builtin-icons.js";
import { generateCsharpAction } from "./csharpAction.js";

function safeFileName(title) {
  const cleaned = String(title || "AI生成动作")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim()
    .slice(0, 40);
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "_");
  return `${cleaned || "AI生成动作"}_${stamp}.json`;
}

function containsPlanStep(steps, type) {
  return Array.isArray(steps) && steps.some((step) => {
    if (step?.type === type) {
      return true;
    }
    return containsPlanStep(step?.steps, type)
      || containsPlanStep(step?.ifSteps, type)
      || containsPlanStep(step?.elseSteps, type)
      || (Array.isArray(step?.branches) && step.branches.some((branch) => containsPlanStep(branch.steps, type)));
  });
}

function hasCsharpPrompt(prompt) {
  return /C#|Roslyn|WMI|Win32[_ ]|注册表|事件日志|开机时间|系统启动时间|WPF|WebView2|Quicker\s*(?:内部|API)|调用系统 API|调用 DLL|自定义窗口/i.test(prompt);
}

function hasModelApiKey(config) {
  return Boolean(config.apiKey && !String(config.apiKey).includes("REDACTED"));
}

export function resolveGenerationMode(prompt, plan, config, requestedMode = "") {
  const explicitMode = String(requestedMode || "").toLowerCase();
  if (explicitMode === "blocks" || explicitMode === "csharp") {
    return explicitMode;
  }
  const configuredMode = String(config.generationMode || "auto").toLowerCase();
  if (configuredMode === "blocks" || configuredMode === "csharp") {
    return configuredMode;
  }
  if (plan?.mode === "csharp") {
    return "csharp";
  }
  if (!hasModelApiKey(config)) {
    return "blocks";
  }
  if (hasCsharpPrompt(prompt) || containsPlanStep(plan?.steps, "todo")) {
    return "csharp";
  }
  return "blocks";
}

export function copyToClipboard(text) {
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "[Console]::InputEncoding = [Text.UTF8Encoding]::new(); Set-Clipboard -Value ([Console]::In.ReadToEnd())"
  ], {
    input: text,
    encoding: "utf8",
    windowsHide: true
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || "写入剪贴板失败");
  }
}

export async function generateAction(prompt, config = loadConfig(), options = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error("prompt 不能为空");
  }

  fs.mkdirSync(config.outputDir, { recursive: true });

  const plan = await planWithModel(config, String(prompt).trim());
  const mode = resolveGenerationMode(String(prompt).trim(), plan, config, options.mode);
  if (mode === "csharp") {
    const result = await generateCsharpAction(String(prompt).trim(), config, plan);
    copyToClipboard(result.path);
    return result;
  }

  const action = buildAction(plan, prompt, { icon: chooseRandomBuiltinIcon(config) });
  const fileName = safeFileName(action.Title);
  const outputPath = path.join(config.outputDir, fileName);
  const actionJson = JSON.stringify(action, null, 2);

  fs.writeFileSync(outputPath, actionJson, "utf8");
  copyToClipboard(outputPath);

  return {
    ok: true,
    path: outputPath,
    title: action.Title,
    actionType: action.ActionType,
    mode: "blocks",
    plan
  };
}

export function buildGeneratorAction(config = loadConfig()) {
  const generatorScript = path.resolve(rootDir, config.generatorScript || "src/generate.js");
  const nodePath = config.nodePath || "node";
  const plan = {
    title: "AI动作生成器",
    description: "输入自然语言，调用本地生成器创建 Quicker 动作 JSON。",
    steps: [
      {
        type: "notify",
        message: "已启动动作生成器，请输入需求。",
        notifyType: "Info"
      },
      {
        type: "user_input",
        prompt: "请描述要生成的 Quicker 动作",
        outputVar: "generatorPrompt",
        multiline: true,
        inputType: "multiline"
      },
      {
        type: "notify",
        message: "已收到需求，正在准备生成。",
        notifyType: "Info"
      },
      {
        type: "gen_temp_file_path",
        ext: ".txt",
        outputVar: "generatorPromptFile"
      },
      {
        type: "write_text_file",
        pathVar: "generatorPromptFile",
        contentVar: "generatorPrompt"
      },
      {
        type: "notify",
        message: "正在调用 AI 生成 Quicker 动作，请稍候。",
        notifyType: "Info"
      },
      {
        type: "run_program",
        path: nodePath,
        args: `$$"${generatorScript}" --prompt-file "{generatorPromptFile}"`,
        workingDir: rootDir,
        waitExit: true,
        stopIfFail: true,
        successVar: "generatorRunSuccess",
        stdoutVar: "generatorStdout",
        stderrVar: "generatorStderr",
        exitCodeVar: "generatorExitCode"
      },
      {
        type: "delete_path",
        pathVar: "generatorPromptFile"
      },
      {
        type: "notify",
        message: "动作已生成，文件路径已复制到剪贴板。C# 动作会自动构建，积木动作请在 Quicker 中导入 JSON。",
        notifyType: "Success"
      }
    ]
  };

  return buildAction(plan, "生成一个 Quicker 动作", {
    icon: chooseRandomBuiltinIcon(config)
  });
}

export function writeGeneratorAction(config = loadConfig()) {
  fs.mkdirSync(config.outputDir, { recursive: true });
  const action = buildGeneratorAction(config);
  const outputPath = path.join(config.outputDir, "AI动作生成器.json");
  const actionJson = JSON.stringify(action, null, 2);
  fs.writeFileSync(outputPath, actionJson, "utf8");
  copyToClipboard(outputPath);
  return {
    ok: true,
    path: outputPath,
    title: action.Title
  };
}

function parseCliArgs(args) {
  const promptParts = [];
  let promptFile = "";
  let createGeneratorAction = false;
  let mode = "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--create-quicker-action") {
      createGeneratorAction = true;
      continue;
    }
    if (arg === "--prompt-file") {
      promptFile = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--mode") {
      mode = args[index + 1] || "";
      index += 1;
      continue;
    }
    promptParts.push(arg);
  }

  return {
    prompt: promptParts.join(" "),
    promptFile,
    createGeneratorAction,
    mode
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.createGeneratorAction) {
    try {
      console.log(JSON.stringify(writeGeneratorAction(), null, 2));
    } catch (error) {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    }
  } else {
    let prompt = cli.prompt;
    if (cli.promptFile) {
      prompt = fs.readFileSync(path.resolve(cli.promptFile), "utf8");
    }
    generateAction(prompt, loadConfig(), { mode: cli.mode })
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((error) => {
        console.error(error.stack || error.message);
        process.exitCode = 1;
      });
  }
}
