import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAction } from "../src/builder.js";

export function buildDissolveAction() {
  return buildAction({
    title: "全部解散（原生积木·V1057-BATCH-SHELL）",
    description: "将选中文件夹及其子文件夹中的所有文件移动到该文件夹的上级目录；重名文件自动按“源文件名_rename_0-5000.原后缀”改名。确认源目录中已无文件后，回收原空目录。",
    steps: [
      {
        type: "get_selected_files",
        outputVar: "选中的文件夹",
        firstFileVar: "第一个文件夹",
        fileCountVar: "文件夹数量"
      },
      {
        type: "assign",
        expression: "$= {文件夹数量} == 0",
        outputVar: "没有选中项",
        outputType: 2
      },
      {
        type: "if",
        conditionVar: "没有选中项",
        ifSteps: [
          {
            type: "stop",
            message: "没有获取到选中的文件夹，动作已停止。",
            isError: true
          }
        ]
      },
      {
        type: "confirm",
        title: "确认",
        message: "【V1057-BATCH-SHELL】是否全部解散选中的文件夹？",
        outputVar: "确认解散"
      },
      {
        type: "if",
        conditionVar: "确认解散",
        ifSteps: [
          {
            type: "each",
            inputVar: "选中的文件夹",
            itemVar: "当前文件夹",
            countVar: "文件夹序号",
            steps: [
              {
                type: "path_info",
                pathVar: "当前文件夹",
                outputs: {
                  name: "当前文件夹名称"
                }
              },
              {
                type: "assign",
                expression: "$= System.IO.Directory.GetParent({当前文件夹}).FullName",
                outputVar: "上级目录"
              },
              {
                type: "enum_files",
                pathVar: "当前文件夹",
                outputVar: "待移动文件",
                searchPattern: "*",
                recursive: true
              },
              {
                type: "enum_files",
                pathVar: "上级目录",
                outputVar: "已占用目标路径",
                searchPattern: "*",
                recursive: false
              },
              {
                type: "assign",
                expression: "$= new System.Collections.Generic.List<string>()",
                outputVar: "待批量移动文件",
                outputType: 4
              },
              {
                type: "each",
                inputVar: "待移动文件",
                itemVar: "当前文件",
                countVar: "文件序号",
                steps: [
                  {
                    type: "path_info",
                    pathVar: "当前文件",
                    outputs: {
                      name: "文件名",
                      nameNoExt: "不含后缀文件名",
                      ext: "原后缀",
                      folderPath: "文件所在目录"
                    }
                  },
              {
                type: "format_string",
                formatString: "{0}\\{1}",
                params: [
                  { varKey: "上级目录" },
                  { varKey: "文件名" }
                ],
                outputVar: "原目标路径"
              },
              {
                type: "check_path_exists",
                pathVar: "原目标路径",
                outputVar: "原目标实际存在"
              },
              {
                type: "assign",
                expression: "$= {原目标实际存在} || {已占用目标路径}.Any(x => string.Equals(x, {原目标路径}, StringComparison.OrdinalIgnoreCase))",
                outputVar: "原目标已存在",
                outputType: 2
              },
              {
                type: "if",
                conditionVar: "原目标已存在",
                ifSteps: [
                  {
                    type: "assign",
                    expression: "$= Math.Abs(Guid.NewGuid().GetHashCode() % 5001)",
                    outputVar: "随机起点",
                    outputType: 12
                  },
                  {
                    type: "assign",
                    expression: "$= false",
                    outputVar: "重命名完成",
                    outputType: 2
                  },
                  {
                    type: "repeat",
                    count: 5001,
                    countVar: "编号偏移",
                    startIndex: 0,
                    delayMs: 0,
                    steps: [
                      {
                        type: "assign",
                        expression: "$= ({随机起点} + {编号偏移}) % 5001",
                        outputVar: "重命名编号"
                      },
                      {
                        type: "format_string",
                        formatString: "{0}_rename_{1}{2}",
                        params: [
                          { varKey: "不含后缀文件名" },
                          { varKey: "重命名编号" },
                          { varKey: "原后缀" }
                        ],
                        outputVar: "重命名文件名"
                      },
                      {
                        type: "format_string",
                        formatString: "{0}\\{1}",
                        params: [
                          { varKey: "上级目录" },
                          { varKey: "重命名文件名" }
                        ],
                        outputVar: "重命名目标路径"
                      },
                      {
                        type: "format_string",
                        formatString: "{0}\\{1}",
                        params: [
                          { varKey: "文件所在目录" },
                          { varKey: "重命名文件名" }
                        ],
                        outputVar: "重命名源路径"
                      },
                      {
                        type: "check_path_exists",
                        pathVar: "重命名目标路径",
                        outputVar: "重命名目标实际存在"
                      },
                      {
                        type: "check_path_exists",
                        pathVar: "重命名源路径",
                        outputVar: "重命名源已存在"
                      },
                      {
                        type: "assign",
                        expression: "$= {重命名目标实际存在} == false && {已占用目标路径}.Any(x => string.Equals(x, {重命名目标路径}, StringComparison.OrdinalIgnoreCase)) == false && {重命名源已存在} == false",
                        outputVar: "重命名候选可用",
                        outputType: 2
                      },
                      {
                        type: "if",
                        conditionVar: "重命名候选可用",
                        ifSteps: [
                          {
                            type: "rename_path",
                            pathVar: "当前文件",
                            dstPath: "$${重命名源路径}"
                          },
                          {
                            type: "list_append",
                            listVar: "待批量移动文件",
                            itemVar: "重命名源路径"
                          },
                          {
                            type: "list_append",
                            listVar: "已占用目标路径",
                            itemVar: "重命名目标路径"
                          },
                          {
                            type: "assign",
                            expression: "$= true",
                            outputVar: "重命名完成",
                            outputType: 2
                          },
                          {
                            type: "break"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    type: "assign",
                    expression: "$= {重命名完成} == false",
                    outputVar: "重命名失败",
                    outputType: 2
                  },
                  {
                    type: "if",
                    conditionVar: "重命名失败",
                    ifSteps: [
                      {
                        type: "stop",
                        message: "重命名编号 0-5000 已全部占用，动作已停止。",
                        isError: true
                      }
                    ]
                  }
                ]
              },
              {
                type: "assign",
                expression: "$= {原目标已存在} == false",
                outputVar: "原目标不存在",
                outputType: 2
              },
              {
                type: "if",
                conditionVar: "原目标不存在",
                ifSteps: [
                  {
                    type: "list_append",
                    listVar: "待批量移动文件",
                    itemVar: "当前文件"
                  },
                  {
                    type: "list_append",
                    listVar: "已占用目标路径",
                    itemVar: "原目标路径"
                  }
                ]
              }
            ]
          },
          {
            type: "assign",
            expression: "$= {待批量移动文件}.Count > 0",
            outputVar: "存在待批量移动文件",
            outputType: 2
          },
          {
            type: "if",
            conditionVar: "存在待批量移动文件",
            ifSteps: [
              {
                type: "move_files",
                pathVar: "待批量移动文件",
                dstPath: "$${上级目录}"
              }
            ]
          },
          {
            type: "assign",
            expression: "$= System.IO.Directory.EnumerateFiles({当前文件夹}, \"*\", System.IO.SearchOption.AllDirectories).Any() == false",
            outputVar: "源目录已清空",
            outputType: 2
          },
          {
            type: "assign",
            expression: "$= {源目录已清空} == false",
            outputVar: "源目录未清空",
            outputType: 2
          },
          {
            type: "if",
            conditionVar: "源目录未清空",
            ifSteps: [
              {
                type: "stop",
                message: "源目录中仍有文件，为避免数据丢失，已停止解散并保留原目录。",
                isError: true
              }
            ]
          },
          {
            type: "if",
            conditionVar: "源目录已清空",
            ifSteps: [
              {
                type: "recycle_path",
                pathVar: "当前文件夹",
                noUi: true
              }
            ]
          }
        ]
      },
      {
        type: "notify",
        message: "V1057-BATCH-SHELL：文件夹已全部解散；重名文件已自动改名。",
        notifyType: "Success"
      }
        ]
      }
    ]
  }, "生成使用 Quicker 原生积木实现的全部解散动作", {
    icon: "https://files.getquicker.net/_icons/6F113D28EEBB88081A345B42C52D000D8393013B.png"
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outputPath = path.resolve(process.argv[2] || "全部解散_原生积木版.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(buildDissolveAction(), null, 2), "utf8");
  console.log(outputPath);
}
