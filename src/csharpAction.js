import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chooseRandomBuiltinIcon } from "./builtin-icons.js";
import { extractJson, requestModel } from "./model.js";

const CSHARP_SYSTEM_PROMPT = `你是 Quicker 普通模式 v2 (Roslyn) 动作开发器，只输出严格 JSON。
把用户需求实现为一个可由 Quicker 构建的 C# 动作，不要输出 Markdown，不要输出代码围栏。

输出格式：
{
  "title": "动作标题",
  "description": "简短描述",
  "keywords": "关键词1,关键词2",
  "references": [],
  "variables": [],
  "code": "C# 源代码字符串",
  "introduction": "动作简介 Markdown 字符串"
}

C# 强制规则：
- code 必须包含 public static string Exec(Quicker.Public.IStepContext context)。
- 只能直接写 using 和方法代码，严禁 namespace 或 class 定义。
- 访问 Quicker 变量只能使用 context.GetVarValue("变量名") 和 context.SetVarValue("变量名", 值)。
- 涉及 WPF 窗口或控件的操作必须放在 Application.Current.Dispatcher.Invoke 中。
- 只使用真实存在的 .NET API，不要虚构 Quicker.Public 方法。
- references 只填写实际需要的 DLL 文件名，例如 System.Management.dll；不需要额外引用时返回空数组。
- variables 使用 Quicker 类型代码：0 文本、1 数字、2 布尔、4 列表、12 整数、13 表格。
- code 和 introduction 必须是合法 JSON 字符串，中文直接使用 UTF-8 中文，不要使用 Unicode 转义。
- 代码应直接完成用户需求，不能返回 TODO 或伪代码。
`;

const VALID_VARIABLE_TYPES = new Set([0, 1, 2, 4, 12, 13]);

function stripCodeFences(code) {
  return String(code || "")
    .replace(/^```(?:csharp|cs)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeVariables(variables) {
  if (!Array.isArray(variables)) {
    return [];
  }

  return variables
    .filter((variable) => variable && typeof variable === "object")
    .map((variable) => {
      const key = String(variable.Key || variable.key || "").trim();
      if (!key || /[\r\n]/.test(key)) {
        return null;
      }

      const rawType = Number(variable.Type ?? variable.type ?? 0);
      const type = VALID_VARIABLE_TYPES.has(rawType) ? rawType : 0;
      const defaultValue = variable.DefaultValue ?? variable.defaultValue ?? "";

      return {
        Key: key,
        Type: type,
        DefaultValue: ["string", "number", "boolean"].includes(typeof defaultValue)
          ? defaultValue
          : "",
        IsInput: Boolean(variable.IsInput ?? variable.isInput),
        IsOutput: Boolean(variable.IsOutput ?? variable.isOutput),
        Desc: String(variable.Desc || variable.desc || "")
      };
    })
    .filter(Boolean);
}

function normalizeReferences(references) {
  if (!Array.isArray(references)) {
    return [];
  }

  return Array.from(new Set(references
    .map((reference) => String(reference || "").trim())
    .filter((reference) => reference && !/[\\/\r\n]/.test(reference))));
}

function normalizeDefinition(definition, plan) {
  if (!definition || typeof definition !== "object") {
    throw new Error("C# 动作生成结果不是 JSON 对象");
  }

  const code = stripCodeFences(definition.code);
  if (!code) {
    throw new Error("C# 动作生成结果缺少 code");
  }
  if (!/public\s+static\s+string\s+Exec\s*\(\s*Quicker\.Public\.IStepContext\s+context\s*\)/.test(code)) {
    throw new Error("C# 动作缺少规定的 Exec 入口签名");
  }
  if (/^\s*namespace\s+/m.test(code) || /^\s*(?:(?:public|internal|private|protected)\s+)?(?:static\s+)?class\s+/m.test(code)) {
    throw new Error("C# 动作不能包含 namespace 或 class 定义");
  }
  if (/\\u[0-9a-fA-F]{4}/.test(code)) {
    throw new Error("C# 动作包含 Unicode 中文转义，请直接使用中文");
  }
  if (/context\.(?!GetVarValue|SetVarValue)\w+/.test(code)) {
    throw new Error("C# 动作使用了未允许的 IStepContext 方法");
  }

  return {
    Title: String(definition.title || plan?.title || "C#动作").trim(),
    Description: String(definition.description || plan?.description || "").trim(),
    Keywords: String(definition.keywords || "Quicker,C#").trim(),
    References: normalizeReferences(definition.references),
    Variables: normalizeVariables(definition.variables),
    Code: code,
    Introduction: String(definition.introduction || definition.description || "").trim()
  };
}

function safeBaseName(title) {
  const cleaned = String(title || "CSharpAction")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "_");
  return `${cleaned || "CSharpAction"}_${stamp}`;
}

function hasAnyFile(basePath) {
  return [".json", ".cs", "_简介.md"].some((suffix) => fs.existsSync(`${basePath}${suffix}`));
}

function createBasePath(outputDir, title) {
  const baseName = safeBaseName(title);
  let basePath = path.join(outputDir, baseName);
  let index = 1;
  while (hasAnyFile(basePath)) {
    basePath = path.join(outputDir, `${baseName}_${index}`);
    index += 1;
  }
  return basePath;
}

function buildWithQuicker(config, jsonPath) {
  const skillDir = config.quickerSkillDir || "C:\\Users\\Administrator\\.codex\\skills\\quicker-skill";
  const buildScript = config.csharpBuildScript || path.join(skillDir, "scripts", "build.ps1");
  if (!fs.existsSync(buildScript)) {
    throw new Error(`未找到 quicker-skill 构建脚本：${buildScript}`);
  }

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    buildScript,
    "-JsonPath",
    jsonPath
  ], {
    encoding: "utf8",
    windowsHide: true,
    timeout: Number(config.csharpBuildTimeoutMs || 120000)
  });
  const output = [result.stdout, result.stderr]
    .filter((value) => value)
    .join("\n")
    .trim();

  if (result.error || result.status !== 0) {
    throw new Error(`C# 动作构建失败${output ? `：\n${output}` : ""}`);
  }

  return output;
}

export function resolveCsharpDefinition(definition, plan) {
  return normalizeDefinition(definition, plan);
}

export async function generateCsharpAction(prompt, config, plan) {
  const content = await requestModel(config, [
    { role: "system", content: CSHARP_SYSTEM_PROMPT },
    {
      role: "user",
      content: `用户需求：\n${prompt}\n\n已有路由计划（仅供参考）：\n${JSON.stringify(plan || {}, null, 2)}`
    }
  ]);
  const definition = normalizeDefinition(JSON.parse(extractJson(content)), plan);
  const outputDir = config.outputDir;
  fs.mkdirSync(outputDir, { recursive: true });
  const basePath = createBasePath(outputDir, definition.Title);
  const jsonPath = `${basePath}.json`;
  const csPath = `${basePath}.cs`;
  const markdownPath = `${basePath}_简介.md`;
  const action = {
    ActionId: "",
    SharedActionId: "00000000-0000-0000-0000-000000000000",
    Title: definition.Title,
    Description: definition.Description,
    Keywords: definition.Keywords,
    ChangeLog: "v1.0.0 初始化版本",
    ShareUrl: "",
    Icon: chooseRandomBuiltinIcon(config),
    Variables: definition.Variables,
    References: definition.References
  };

  fs.writeFileSync(jsonPath, JSON.stringify(action, null, 2), "utf8");
  fs.writeFileSync(csPath, definition.Code, "utf8");
  fs.writeFileSync(markdownPath, definition.Introduction || `# ${definition.Title}\n\n${definition.Description}`, "utf8");

  const buildOutput = buildWithQuicker(config, jsonPath);
  const builtAction = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  return {
    ok: true,
    mode: "csharp",
    path: jsonPath,
    sourcePaths: {
      json: jsonPath,
      csharp: csPath,
      introduction: markdownPath
    },
    title: builtAction.Title || definition.Title,
    actionType: "csharp",
    actionId: builtAction.ActionId || "",
    plan,
    buildOutput
  };
}
