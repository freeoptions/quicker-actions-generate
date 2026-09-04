import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

export function buildClashModeAction() {
  return buildAction({
    title: "Clash 模式手动选择 V8",
    description: "手动选择规则、全局或直连模式，直接触发 Clash Verge Rev 对应的全局快捷键。",
    steps: [
      {
        type: "select",
        mode: "single",
        prompt: "请选择 Clash 模式",
        items: [
          { label: "规则模式", value: "rule" },
          { label: "全局模式", value: "global" },
          { label: "直连模式", value: "direct" }
        ],
        outputVar: "选择模式",
        branches: [
          {
            when: "rule",
            steps: [
              {
                type: "key_input",
                ctrlKeys: [162, 164, 160],
                keys: [49],
                delayMs: 100
              },
              {
                type: "notify",
                message: "已切换到规则模式",
                notifyType: "Success"
              }
            ]
          },
          {
            when: "global",
            steps: [
              {
                type: "key_input",
                ctrlKeys: [162, 164, 160],
                keys: [50],
                delayMs: 100
              },
              {
                type: "notify",
                message: "已切换到全局模式",
                notifyType: "Success"
              }
            ]
          },
          {
            when: "direct",
            steps: [
              {
                type: "key_input",
                ctrlKeys: [162, 164, 160],
                keys: [51],
                delayMs: 100
              },
              {
                type: "notify",
                message: "已切换到直连模式",
                notifyType: "Success"
              }
            ]
          }
        ]
      }
    ]
  }, "生成 Clash Verge Rev 模式手动选择动作", {
    icon: "https://raw.githubusercontent.com/clash-verge-rev/clash-verge-rev/main/src-tauri/icons/icon.png"
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "Clash模式手动选择.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(buildClashModeAction(), null, 2), "utf8");
  console.log(outputPath);
}
