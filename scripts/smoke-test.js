import { buildAction } from "../src/builder.js";

const cases = [
  {
    name: "用户选择分支",
    plan: {
      title: "按选项打开网页",
      steps: [{
        type: "select",
        mode: "single",
        outputVar: "choice",
        items: [{ label: "a", value: "a" }, { label: "b", value: "b" }],
        branches: [
          { when: "a", steps: [{ type: "open_url", url: "https://www.baidu.com" }] },
          { when: "b", steps: [{ type: "comment", message: "不执行" }] }
        ]
      }]
    },
    expected: ["sys:select", "sys:simpleIf", "sys:openUrl", "sys:comment"]
  },
  {
    name: "确认后移动文件",
    plan: {
      title: "确认移动",
      steps: [
        { type: "confirm", message: "确认移动？", outputVar: "ok" },
        { type: "if", condition: "$= {ok} == true", ifSteps: [{ type: "move_files", path: "D:\\a.txt", dstPath: "D:\\bak" }] }
      ]
    },
    expected: ["sys:MsgBox", "sys:simpleIf", "sys:fileOperation"]
  },
  {
    name: "停止动作",
    plan: {
      title: "停止",
      steps: [{ type: "stop", message: "用户取消，动作结束" }]
    },
    expected: ["sys:stop"]
  },
  {
    name: "选中文件路径解析",
    plan: {
      title: "解析选中文件",
      steps: [
        { type: "get_selected_files", outputVar: "files", firstFileVar: "firstFile" },
        { type: "path_info", pathVar: "firstFile", outputs: { name: "fileName", folderPath: "folderPath" } }
      ]
    },
    expected: ["sys:getSelectedFiles", "sys:pathExtraction"]
  },
  {
    name: "文本处理",
    plan: {
      title: "处理文本",
      steps: [
        { type: "get_clipboard_text", outputVar: "text" },
        { type: "replace_text", inputVar: "text", oldValue: "\\r\\n", newValue: "", outputVar: "text" },
        { type: "split_string", inputVar: "text", separator: ",", outputVar: "list" },
        { type: "join_list", listVar: "list", separator: "|", outputVar: "output" },
        { type: "write_clipboard", varKey: "output" }
      ]
    },
    expected: ["sys:getClipboardText", "sys:strReplace", "sys:splitString", "sys:joinList", "sys:writeClipboard"]
  },
  {
    name: "循环处理",
    plan: {
      title: "循环",
      steps: [
        { type: "enum_files", path: "D:\\tmp", outputVar: "files" },
        { type: "each", inputVar: "files", itemVar: "item", steps: [{ type: "list_append", listVar: "out", itemVar: "item" }] },
        { type: "repeat", count: 3, steps: [{ type: "key_input", keys: [13] }] }
      ]
    },
    expected: ["sys:fileOperation", "sys:each", "sys:listOperations", "sys:repeat", "sys:keyInput"]
  },
  {
    name: "读写文件",
    plan: {
      title: "读写文件",
      steps: [
        { type: "read_text_file", path: "D:\\a.txt", outputVar: "text" },
        { type: "write_text_file", path: "D:\\b.txt", contentVar: "text" }
      ]
    },
    expected: ["sys:readFile", "sys:WriteTextFile"]
  }
  ,
  {
    name: "时间和格式化",
    plan: {
      title: "时间",
      steps: [
        { type: "get_current_time", format: "yyyyMMdd", outputVar: "now" },
        { type: "format_string", formatString: "今天是{0}", params: [{ varKey: "now" }], outputVar: "text" },
        { type: "show_text", textVar: "text", title: "预览" }
      ]
    },
    expected: ["sys:getCurrentTime", "sys:formatString", "sys:showText"]
  },
  {
    name: "窗口和音频",
    plan: {
      title: "窗口音频",
      steps: [
        { type: "get_active_process_info", outputVar: "procName" },
        { type: "get_folder_path", folder: "Desktop", outputVar: "dir" },
        { type: "window_operation", operation: "close", hWnd: "$={mainWinHandle}" },
        { type: "audio_control", operation: "GetOutputDefaultDevice" }
      ]
    },
    expected: ["sys:getActiveProcessInfo", "sys:getFolderPath", "sys:windowOperations", "sys:audioControl"]
  },
  {
    name: "下载与动作",
    plan: {
      title: "下载",
      steps: [
        { type: "download", url: "https://example.com/a.txt", savePath: "D:\\tmp", saveName: "a.txt" },
        { type: "run_action", actionId: "00000000-0000-0000-0000-000000000000", inputParam: "x", outputVar: "out" },
        { type: "key_state", key: "Escape", outputVar: "exit" }
      ]
    },
    expected: ["sys:download", "sys:runAction", "sys:keyoperation"]
  }
];

function collectStepKeys(steps, result = []) {
  for (const step of steps || []) {
    result.push(step.StepRunnerKey);
    collectStepKeys(step.IfSteps, result);
    collectStepKeys(step.ElseSteps, result);
  }
  return result;
}

let failed = 0;
for (const item of cases) {
  const action = buildAction(item.plan, item.name);
  const keys = collectStepKeys(JSON.parse(action.Data).Steps);
  const missing = item.expected.filter((key) => !keys.includes(key));
  if (missing.length) {
    failed += 1;
    console.error(`[FAIL] ${item.name}: missing ${missing.join(", ")}; got ${keys.join(", ")}`);
  } else {
    console.log(`[OK] ${item.name}: ${keys.join(", ")}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
