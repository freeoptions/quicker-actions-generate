import path from "node:path";

function uniqTitle(text) {
  const compact = String(text || "AI生成动作")
    .replace(/https?:\/\/[^\s"'，。；;]+/gi, "")
    .replace(/[A-Za-z]:\\[^\s"'，。；;]+/g, "")
    .replace(/\s+/g, "");
  return compact.slice(0, 18) || "AI生成动作";
}

function extractUrls(text) {
  return Array.from(String(text).matchAll(/https?:\/\/[^\s"'，。；;]+/gi), (match) => match[0]);
}

function extractWindowsPaths(text) {
  const source = String(text);
  const quoted = Array.from(source.matchAll(/["“]([A-Za-z]:\\[^"”\r\n]+)["”]/g), (match) => match[1].trim());
  const byExt = Array.from(source.matchAll(/[A-Za-z]:\\.*?\.(?:sql|txt|json|md|csv|xlsx?|docx?|pptx?|png|jpe?g|gif|webp|mp4|zip|rar|7z|exe|bat|ps1|ahk)\b/gi), (match) => match[0].trim());
  const folderLike = Array.from(source.matchAll(/[A-Za-z]:\\[^，。；;\r\n"'”]+/g), (match) => match[0].trim());
  return Array.from(new Set([...quoted, ...byExt, ...folderLike]));
}

function guessClipboardText(text) {
  const match = String(text).match(/(?:写入|复制到|设置到|放到)剪贴板(?:内容|文本)?[为是:]?\s*["“]([^"”]+)["”]/);
  return match?.[1]?.trim();
}

function guessChoiceOpenUrls(text) {
  if (!/选择|选项|用户选择/.test(text)) {
    return null;
  }

  const pairs = [];
  const regex = /(?:选择|选项)?\s*([A-Za-z0-9一二三四五六七八九十]+)[，,。；;\s]*(?:打开|访问)?\s*(https?:\/\/[^\s"'，。；;]+)/gi;
  for (const match of String(text).matchAll(regex)) {
    pairs.push({ value: match[1], label: match[1], url: match[2] });
  }

  const noopRegex = /(?:选择|选项)?\s*([A-Za-z0-9一二三四五六七八九十]+)[，,。；;\s]*(?:不执行|什么都不做|不操作|无操作)/gi;
  for (const match of String(text).matchAll(noopRegex)) {
    pairs.push({ value: match[1], label: match[1], noop: true });
  }

  if (pairs.length < 2) {
    return null;
  }

  const uniquePairs = [];
  const seen = new Set();
  for (const item of pairs) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    uniquePairs.push(item);
  }

  return {
    type: "select",
    mode: "single",
    prompt: "请选择",
    outputVar: "choice",
    items: uniquePairs.map((item) => ({ label: item.label, value: item.value })),
    branches: uniquePairs.map((item) => ({
      when: item.value,
      steps: item.noop
        ? [{ type: "comment", message: `用户选择 ${item.value}，不执行任何操作` }]
        : [{ type: "open_url", url: item.url }]
    }))
  };
}

function splitClauses(text) {
  return String(text)
    .split(/(?:然后|接着|随后|再|并且|以及|，|,|。|；|;|、|\n)+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRepeatCount(text) {
  const match = String(text).match(/(?:循环|重复|执行)\s*(\d+)\s*(?:次|遍)/);
  return match ? Number(match[1]) : null;
}

function parseDelayMs(text) {
  const match = String(text).match(/等待\s*(\d+)\s*ms?/i);
  return match ? Number(match[1]) : null;
}

function parseMouseAction(text) {
  if (/右键|右击|右单击/.test(text)) return "right";
  if (/双击|双键/.test(text)) return "double";
  if (/中键|滚轮/.test(text)) return "middle";
  if (/不点击|仅移动|只移动/.test(text)) return "none";
  if (/左键|左击|单击|点击/.test(text)) return "left";
  return null;
}

function parseMousePoint(text) {
  const coord = String(text).match(/(?:坐标|位置)?\s*(\d{2,5})\s*[，,]\s*(\d{2,5})/);
  if (coord) {
    return { x: Number(coord[1]), y: Number(coord[2]) };
  }

  const label = String(text).match(/([A-Za-z一-龥0-9_]+)位置/);
  if (label) {
    return { x: `TODO_${label[1]}_X`, y: `TODO_${label[1]}_Y` };
  }

  return null;
}

function buildMouseMacroPlan(text) {
  const clauses = splitClauses(text);
  if (!clauses.length) {
    return null;
  }

  const steps = [];
  let pendingPoint = null;
  let sawMouse = false;

  for (const clause of clauses) {
    const delayMs = parseDelayMs(clause);
    if (delayMs != null) {
      steps.push({ type: "delay", delayMs });
      continue;
    }

    const point = parseMousePoint(clause);
    const action = parseMouseAction(clause);

    if (point) {
      sawMouse = true;
      pendingPoint = point;
      if (action) {
        steps.push({ type: "mouse_click", x: point.x, y: point.y, action });
        pendingPoint = null;
      }
      continue;
    }

    if (action && pendingPoint) {
      sawMouse = true;
      steps.push({ type: "mouse_click", x: pendingPoint.x, y: pendingPoint.y, action });
      pendingPoint = null;
      continue;
    }
  }

  if (pendingPoint) {
    sawMouse = true;
    steps.push({ type: "mouse_click", x: pendingPoint.x, y: pendingPoint.y, action: "none" });
  }

  const repeatCount = parseRepeatCount(text);
  if (!sawMouse || !steps.length) {
    return null;
  }

  if (repeatCount && repeatCount > 1) {
    return {
      title: uniqTitle(text),
      description: "鼠标宏",
      steps: [
        {
          type: "repeat",
          count: repeatCount,
          delayMs: 50,
          steps
        }
      ]
    };
  }

  return {
    title: uniqTitle(text),
    description: "鼠标宏",
    steps
  };
}

export function inferSelectPlan(prompt) {
  return guessChoiceOpenUrls(prompt);
}

export function inferMousePlan(prompt) {
  return buildMouseMacroPlan(prompt);
}

export function fallbackPlan(prompt, reason = "") {
  const text = String(prompt || "");
  const selectPlan = guessChoiceOpenUrls(text);
  if (selectPlan) {
    return selectPlan;
  }

  const mousePlan = buildMouseMacroPlan(text);
  if (mousePlan) {
    return mousePlan;
  }

  const steps = [];
  const urls = extractUrls(text);
  const paths = extractWindowsPaths(text);
  const clipboardText = guessClipboardText(text);

  for (const url of urls) {
    if (/请求|接口|HTTP|get/i.test(text)) {
      steps.push({ type: "http_get", url, outputVar: "httpContent", statusVar: "statusCode" });
    } else {
      steps.push({ type: "open_url", url });
    }
  }

  if (clipboardText) {
    steps.push({ type: "write_clipboard", text: clipboardText });
  }

  if (/枚举|列出|获取.*文件/.test(text)) {
    steps.push({
      type: "enum_files",
      path: paths[0] || "TODO_填写_目录路径",
      outputVar: "files",
      searchPattern: "*",
      recursive: /递归|全部/.test(text)
    });
  }

  if (/当前选中|选中的文件/.test(text)) {
    steps.push({ type: "get_selected_files", outputVar: "files", firstFileVar: "firstFilePath", fileCountVar: "fileCount" });
  }

  if (/当前目录|资源管理器路径/.test(text)) {
    steps.push({ type: "get_explorer_path", outputVar: "dir" });
  }

  if (/读取剪贴板|获取剪贴板/.test(text)) {
    steps.push({ type: "get_clipboard_text", outputVar: "clipboardText" });
  }

  if (/检查.*路径|判断.*存在|是否存在/.test(text)) {
    steps.push({ type: "check_path_exists", path: paths[0] || "TODO_填写_路径", outputVar: "isExists" });
  }

  if (/创建文件夹|新建文件夹/.test(text)) {
    steps.push({ type: "create_folder", path: paths[0] || "TODO_填写_目录路径" });
  }

  if (/创建文件|新建文件/.test(text)) {
    steps.push({ type: "create_file", path: paths[0] || "TODO_填写_文件路径" });
  }

  if (/复制/.test(text) && paths.length) {
    steps.push({ type: "copy_files", path: paths[0], dstPath: paths[1] || "TODO_填写_目标目录" });
  }

  if (/移动|转移|放到/.test(text) && paths.length) {
    steps.push({ type: "move_files", path: paths[0], dstPath: paths[1] || "TODO_填写_目标目录" });
  }

  if (/回收站/.test(text) && paths.length) {
    steps.push({ type: "recycle_path", path: paths[0] });
  }

  if (/删除/.test(text) && paths.length) {
    steps.push({ type: "delete_path", path: paths[0] });
  }

  if (/重命名/.test(text) && paths.length) {
    steps.push({ type: "rename_path", path: paths[0], dstPath: paths[1] || "TODO_填写_新路径" });
  }

  if (/运行|启动|打开.*程序|打开.*软件/.test(text)) {
    const exePath = paths.find((item) => /\.exe$/i.test(item));
    if (exePath) {
      steps.push({ type: "run_program", path: exePath });
    }
  }

  if (!steps.length) {
    steps.push({ type: "todo", message: `暂未识别到已模板化积木：${text}` });
  }

  if (reason) {
    steps.unshift({ type: "todo", message: reason });
  }

  return {
    title: uniqTitle(text),
    description: reason || "规则解析草稿",
    steps
  };
}
