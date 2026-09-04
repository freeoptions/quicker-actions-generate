import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

export function buildDissolveDiagnosticAction() {
  return buildAction({
    title: "全部解散诊断（V1048·不改文件）",
    description: "只读取并显示资源管理器当前选中的文件夹，不移动、不重命名、不删除任何文件。",
    steps: [
      {
        type: "get_selected_files",
        outputVar: "诊断选中项",
        firstFileVar: "诊断首项",
        fileCountVar: "诊断数量"
      },
      {
        type: "show_text",
        title: "全部解散诊断 V1048",
        text: "$$版本：V1048\r\n选中数量：{诊断数量}\r\n首个路径：{诊断首项}"
      },
      {
        type: "stop",
        message: "诊断结束，未执行任何文件操作。"
      }
    ]
  }, "诊断 Quicker 获取资源管理器选中项的实际结果");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "全部解散诊断_V1048_不改文件.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(buildDissolveDiagnosticAction(), null, 2), "utf8");
  console.log(outputPath);
}
