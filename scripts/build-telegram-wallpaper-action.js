import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

const pythonwPath = "C:\\Python312\\pythonw.exe";
const scriptDir = "D:\\@ImmovableResources\\Scripts";
const scriptPath = `${scriptDir}\\telegram_desktop_wallpaper_rotator.py`;
const wallpaperFolder = "E:\\@电脑壁纸-待处理\\@电脑壁纸-Desktop";
const logPath = "C:\\Users\\freez\\AppData\\Local\\TelegramWallpaperRotator\\desktop-ui.log";

export function buildRandomTelegramWallpaperAction() {
  return buildAction({
    title: "随机更换 Telegram 壁纸",
    description: `调用现有 Telegram 壁纸脚本，失败日志：${logPath}`,
    steps: [
      {
        type: "run_program",
        path: pythonwPath,
        args: `"${scriptPath}" --folder "${wallpaperFolder}" --recursive`,
        workingDir: scriptDir,
        waitExit: true,
        stopIfFail: false,
        successVar: "telegramWallpaperRunSuccess",
        exitCodeVar: "telegramWallpaperExitCode"
      },
      {
        type: "if",
        condition: "$= {telegramWallpaperExitCode} == 0",
        ifSteps: [
          {
            type: "notify",
            message: "Telegram 壁纸更换完成",
            notifyType: "Success"
          }
        ]
      },
      {
        type: "if",
        condition: "$= {telegramWallpaperExitCode} != 0",
        ifSteps: [
          {
            type: "notify",
            message: "壁纸更换失败，请查看日志",
            notifyType: "Error"
          }
        ]
      }
    ]
  }, "生成随机更换 Telegram 壁纸动作");
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
    path: pythonwPath,
    arg: `"${scriptPath}" --folder "${wallpaperFolder}" --recursive`,
    setWorkingDir: scriptDir,
    waitExit: "true",
    stopIfFail: "0",
    windowStyle: "0",
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

  const stepKeys = data.Steps.map((step) => step?.StepRunnerKey);
  if (stepKeys.includes("sys:mouse") || stepKeys.includes("sys:keyInput")) {
    throw new Error("动作不应包含鼠标或键盘模拟积木");
  }

  const variables = new Map((data.Variables || []).map((item) => [item.Key, item.Type]));
  if (variables.get("telegramWallpaperExitCode") !== 12) {
    throw new Error("退出码变量必须声明为整数");
  }
  if (variables.get("telegramWallpaperRunSuccess") !== 2) {
    throw new Error("运行成功变量必须声明为布尔值");
  }

  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "随机更换Telegram壁纸_普通组合动作_v2.json");
  if (fs.existsSync(outputPath)) {
    throw new Error(`目标文件已存在，为避免覆盖而停止：${outputPath}`);
  }

  const action = buildRandomTelegramWallpaperAction();
  const data = verifyAction(action);
  const actionJson = JSON.stringify(action, null, 2);
  if (actionJson.includes("\\u")) {
    throw new Error("动作 JSON 不应包含 Unicode 转义");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, actionJson, "utf8");
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  JSON.parse(written.Data);
  console.log(JSON.stringify({ outputPath, actionType: action.ActionType, stepCount: data.Steps.length }, null, 2));
}
