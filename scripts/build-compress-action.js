import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

const PASSWORD = "sahfQ84LO5143.a--12zweM";

function runCompressionScript(targetPath, volume) {
  return {
    type: "run_script",
    script: `$$Bandizip c -l:0 -v:${volume} -p:${PASSWORD} ${targetPath} "{完整路径}"`,
    runType: "CMD_H",
    encoding: "default",
    outputEncoding: "oem",
    workingDir: "",
    runAsAdmin: false,
    waitToExit: "0"
  };
}

function splitSelection(targetPath) {
  return {
    type: "select",
    mode: "single",
    outputVar: "压缩方式",
    prompt: "请选择压缩方式？",
    note: "请选择压缩方式？",
    items: [
      { label: "不分卷压缩", value: 0 },
      { label: "分卷压缩（每卷 1.9GB）", value: 1 }
    ],
    branches: [
      { when: 0, steps: [runCompressionScript(targetPath, "100gb")] },
      { when: 1, steps: [runCompressionScript(targetPath, "1.9gb")] }
    ]
  };
}

export function buildCompressAction() {
  return buildAction({
    title: "多轮选择压缩",
    description: "先选择压缩到当前目录或指定目录，再选择是否按每卷 1.9GB 分卷压缩。当前仅支持对 1 个选中文件或文件夹进行压缩。",
    steps: [
      {
        type: "select",
        mode: "single",
        outputVar: "输出位置模式",
        prompt: "请选择压缩到哪里？",
        note: "请选择压缩到哪里？",
        items: [
          { label: "当前目录", value: 0 },
          { label: "指定目录", value: 1 }
        ],
        branches: []
      },
      {
        type: "get_selected_files",
        outputVar: "选中的列表",
        firstFileVar: "完整路径",
        fileCountVar: null
      },
      {
        type: "path_info",
        path: "$={选中的列表}[0]",
        outputs: { nameNoExt: "压缩文件名" }
      },
      {
        type: "if",
        condition: "$= {输出位置模式} == 0",
        ifSteps: [splitSelection('./"{压缩文件名}".zip')]
      },
      {
        type: "if",
        condition: "$= {输出位置模式} == 1",
        ifSteps: [
          {
            type: "select",
            mode: "single",
            outputVar: "目标文件夹路径",
            outputField: "selectedItemTitle",
            prompt: "请选择压缩到哪个指定目录？",
            note: "请选择压缩到哪个指定目录？",
            items: [
              { label: "C:\\@temp-transfer", value: 0 },
              { label: "D:\\@Downloads", value: 1 },
              { label: "E:\\@Downloads", value: 2 }
            ],
            branches: []
          },
          splitSelection('"{目标文件夹路径}\\{压缩文件名}".zip')
        ]
      }
    ]
  }, "生成多轮选择压缩动作");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "压缩_多轮选择.json");
  if (fs.existsSync(outputPath)) {
    throw new Error(`目标文件已存在，为避免覆盖：${outputPath}`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(buildCompressAction(), null, 2), "utf8");
  console.log(outputPath);
}
