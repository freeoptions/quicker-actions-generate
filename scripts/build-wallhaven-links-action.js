import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

const pythonPath = "C:\\Python312\\python.exe";
const workingDir = "D:\\@ImmovableResources\\Scripts";
const scriptPath = `${workingDir}\\wallhaven_links.py`;

export function buildWallhavenLinksAction() {
  return buildAction({
    title: "Wallhaven 链接抓取",
    description: "从统一脚本目录启动 Wallhaven 链接抓取脚本，将所有类型链接合并保存为一个 TXT 文件。",
    steps: [
      {
        type: "notify",
        message: "正在启动统一脚本目录中的 Wallhaven 链接抓取脚本",
        notifyType: "Info"
      },
      {
        type: "run_program",
        path: pythonPath,
        args: `-u "${scriptPath}"`,
        workingDir,
        waitExit: true,
        stopIfFail: true
      },
      {
        type: "notify",
        message: "Wallhaven 链接抓取已结束，链接已合并保存为一个 TXT 文件，请查看 E:\\@imFile-Download 文件夹",
        notifyType: "Success"
      }
    ]
  }, "生成 Wallhaven 链接抓取动作");
}

function verifyAction(action) {
  if (!action || typeof action.Data !== "string") {
    throw new Error("动作外层 JSON 缺少字符串 Data");
  }

  const data = JSON.parse(action.Data);
  const runStep = data.Steps?.find((step) => step?.StepRunnerKey === "sys:run");
  if (!runStep) {
    throw new Error("动作中未找到 sys:run");
  }

  const input = runStep.InputParams || {};
  const value = (key) => input[key]?.Value;
  const expected = {
    path: pythonPath,
    arg: `-u "${scriptPath}"`,
    runas: "false",
    stopIfFail: "1",
    setWorkingDir: workingDir,
    windowStyle: "0",
    waitExit: "true",
    outputEncoding: "utf8"
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value(key) !== expectedValue) {
      throw new Error(`sys:run 参数 ${key} 不符合预期`);
    }
  }
  if (String(value("arg")).includes("--clipboard")) {
    throw new Error("动作参数不应包含 --clipboard");
  }

  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "Wallhaven链接抓取_普通组合动作_v4.json");
  if (fs.existsSync(outputPath)) {
    throw new Error(`目标文件已存在，为避免覆盖而停止：${outputPath}`);
  }

  const action = buildWallhavenLinksAction();
  const data = verifyAction(action);
  const actionJson = JSON.stringify(action, null, 2);
  if (actionJson.includes("\\u")) {
    throw new Error("动作 JSON 不应包含 Unicode 转义");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, actionJson, "utf8");
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  JSON.parse(JSON.parse(fs.readFileSync(outputPath, "utf8")).Data);
  console.log(JSON.stringify({ outputPath, actionType: action.ActionType, stepCount: data.Steps.length }, null, 2));
}
