import { baseStep, paramValue, paramVar } from "./quicker.js";

function normalizeMouseAction(action) {
  const value = String(action || "left").toLowerCase();
  if (value === "double" || value === "leftdbclick" || value === "leftdouble" || value === "dblclick") {
    return "leftDbClick";
  }
  if (value === "right" || value === "rightclick") {
    return "right";
  }
  if (value === "middle" || value === "middleclick") {
    return "middle";
  }
  if (value === "none" || value === "move" || value === "moveonly") {
    return "none";
  }
  return "left";
}

function inputRef(value, varKey) {
  if (varKey && !String(varKey).startsWith("TODO_")) {
    return paramVar(varKey);
  }
  if (typeof value === "string") {
    const match = value.match(/^\{([^{}]+)\}$/);
    if (match && !match[1].startsWith("TODO_")) {
      return paramVar(match[1]);
    }
  }
  return paramValue(value);
}

function outputRef(value, fallback = null) {
  if (!value || String(value).startsWith("TODO_")) {
    return fallback;
  }
  return value;
}

export function todoStep(message) {
  return commentStep(`TODO: ${message}`);
}

export function commentStep(message) {
  return baseStep("sys:comment", {
    note: paramValue(message || "")
  });
}

export function notifyStep(message, type = "Success") {
  return baseStep("sys:notify", {
    type: paramValue(type),
    msg: paramValue(message),
    maxLines: paramValue("0"),
    style: paramValue("Style2")
  });
}

export function stopStep(message = "", isError = false) {
  return baseStep("sys:stop", {
    method: paramValue("default"),
    isError: paramValue(isError ? "1" : "0"),
    return: paramValue(""),
    showMessage: paramValue(message)
  }, {});
}

export function openUrlStep(url, browser = "default") {
  return baseStep("sys:openUrl", {
    url: paramValue(url || "TODO_填写_URL"),
    browser: paramValue(browser),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function writeClipboardStep(text, varKey) {
  return baseStep("sys:writeClipboard", {
    type: paramValue("auto"),
    input: inputRef(text || "TODO_填写_剪贴板内容", varKey),
    successMsg: paramValue(""),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function keyInputStep(keysJson, delayMs = 0) {
  return baseStep("sys:keyInput", {
    keys: paramValue(keysJson || "{\"CtrlKeys\":[],\"Keys\":[]}"),
    repeat: paramValue("1"),
    interval: paramValue("1"),
    holdMs: paramValue("-1")
  }, {}, { DelayMs: Number(delayMs || 0) });
}

export function keyInputByCodesStep(keys = [], ctrlKeys = [], delayMs = 0) {
  return keyInputStep(JSON.stringify({
    CtrlKeys: ctrlKeys,
    Keys: keys
  }), delayMs);
}

export function delayStep(delayMs) {
  return baseStep("sys:delay", {
    delayMs: paramValue(delayMs || "100")
  }, {}, { Note: null });
}

export function mouseClickStep(x, y, delayMs = 0, action = "left") {
  return baseStep("sys:mouse", {
    type: paramValue("moveToXy"),
    xy: paramValue(`${x ?? "TODO_X"},${y ?? "TODO_Y"}`),
    slowMove: paramValue("0"),
    extAction: paramValue(normalizeMouseAction(action)),
    restoreMousePos: paramValue("0")
  }, {}, { DelayMs: Number(delayMs || 0) });
}

export function mouseStep(options = {}) {
  const type = options.mouseType || options.type || "moveToXy";
  return baseStep("sys:mouse", {
    type: paramValue(type),
    xy: paramValue(`${options.x ?? "TODO_X"},${options.y ?? "TODO_Y"}`),
    slowMove: paramValue(options.slowMove ? "1" : "0"),
    extAction: paramValue(normalizeMouseAction(options.action || options.extAction)),
    restoreMousePos: paramValue(options.restoreMousePos ? "1" : "0"),
    btn: paramValue(options.btn || "")
  }, {}, { DelayMs: Number(options.delayMs || 0) });
}

export function userInputStep(outputVar = "textValue", prompt = "请输入内容", multiline = true) {
  return baseStep("sys:userInput", {
    type: paramValue(multiline ? "multiline" : "text"),
    prompt: paramValue(prompt),
    defaultValue: paramValue(""),
    pattern: paramValue(""),
    isRequired: paramValue("1"),
    submitWithReturn: paramValue("0"),
    restoreFocus: paramValue("1"),
    closeOnDeactivated: paramValue("0"),
    topMost: paramValue("0"),
    stopIfFail: paramValue("1"),
    texttools: paramValue(""),
    extraSettings: paramValue(""),
    fontfamily: paramValue(""),
    fontsize: paramValue("14"),
    winLocation: paramValue("CenterScreen"),
    imeState: paramValue("NO_CONTROL"),
    help: paramValue("")
  }, {
    isSuccess: null,
    textValue: outputVar,
    isEmpty: null,
    errMessage: null
  });
}

export function writeClipboardStepRich(text, varKey, options = {}) {
  const clipType = options.clipType || options.clipboardType || "auto";
  const inputParams = {
    type: paramValue(clipType),
    successMsg: paramValue(options.successMsg || ""),
    stopIfFail: paramValue("1")
  };
  if (clipType === "image") {
    inputParams.imageVar = inputRef("", options.imageVar || varKey);
  } else if (clipType === "html") {
    inputParams.html = inputRef(options.html || "", options.htmlVar);
    inputParams.text = inputRef(text || "", varKey || options.textVar);
  } else if (clipType === "text") {
    inputParams.text = inputRef(text || "TODO_填写_剪贴板内容", varKey);
  } else {
    inputParams.input = inputRef(text || "TODO_填写_剪贴板内容", varKey);
  }
  return baseStep("sys:writeClipboard", inputParams, {
    isSuccess: null,
    errMessage: null
  });
}

export function userInputStepRich(outputVar = "textValue", prompt = "请输入内容", multiline = true, options = {}) {
  const inputType = options.inputType || options.userInputType || (multiline ? "multiline" : "text");
  return baseStep("sys:userInput", {
    type: paramValue(inputType),
    prompt: paramValue(prompt),
    defaultValue: paramValue(options.defaultValue || ""),
    pattern: paramValue(options.pattern || ""),
    isRequired: paramValue(options.isRequired === false ? "0" : "1"),
    submitWithReturn: paramValue("0"),
    restoreFocus: paramValue("1"),
    closeOnDeactivated: paramValue("0"),
    topMost: paramValue("0"),
    stopIfFail: paramValue("1"),
    texttools: paramValue(""),
    extraSettings: paramValue(""),
    fontfamily: paramValue(""),
    fontsize: paramValue("14"),
    winLocation: paramValue("CenterScreen"),
    imeState: paramValue("NO_CONTROL"),
    help: paramValue("")
  }, {
    isSuccess: null,
    textValue: outputVar,
    numberValue: inputType === "number" ? outputVar : null,
    isEmpty: null,
    errMessage: null
  });
}

export function selectStep(options = {}) {
  const mode = options.mode === "multi" ? "multi" : "single";
  const outputVar = options.outputVar || (mode === "multi" ? "multiSelected" : "choice");
  const items = Array.isArray(options.items) && options.items.length
    ? options.items.map((item, index) => {
      const label = item.label ?? item.title ?? String(item.value ?? index + 1);
      const value = item.value ?? String(index + 1);
      return `${label}|${value}`;
    }).join("\r\n")
    : "选项A|a\r\n选项B|b";

  const inputParams = {
    type: paramValue(mode),
    prompt: paramValue(options.prompt || "请选择"),
    note: paramValue(options.note || ""),
    items: paramValue(items),
    showFilter: paramValue("auto"),
    filterContent: paramValue(""),
    winLocation: paramValue("WithMouse1"),
    maxWinSize: paramValue(""),
    keepLastPos: paramValue("1"),
    closeOnDeactivated: paramValue("0"),
    restoreForeground: paramValue("1"),
    allowOkWhenEmpty: paramValue("0"),
    topMost: paramValue("1"),
    stopIfCancel: paramValue("1"),
    imeState: paramValue("NO_CONTROL"),
    operations: paramValue(""),
    fontsize: paramValue("12"),
    fontfamily: paramValue(""),
    iconsize: paramValue("16"),
    autoCloseSeconds: paramValue("0"),
    noKeyboard: paramValue("false"),
    windowKey: paramValue(""),
    help: paramValue("")
  };

  const outputParams = {
    isSuccess: null,
    extraOperation: null,
    selectedFullItems: null,
    filterContent: null,
    errMessage: null
  };

  if (mode === "multi") {
    inputParams.defaultValueMulti = paramValue("");
    outputParams.selectedIndexList = null;
    outputParams.multiSelected = outputVar;
  } else {
    inputParams.defaultValue = paramValue("");
    inputParams.enableQuickConfirm = paramValue("1");
    const outputField = options.outputField === "selectedItemTitle"
      ? "selectedItemTitle"
      : "textValue";
    outputParams.textValue = outputField === "textValue" ? outputVar : null;
    outputParams.selectedIndex = null;
    outputParams.selectedItemTitle = outputField === "selectedItemTitle" ? outputVar : null;
  }

  return baseStep("sys:select", inputParams, outputParams);
}

export function simpleIfStep(condition, ifSteps = [], elseSteps = null, conditionVar = null) {
  return baseStep("sys:simpleIf", {
    condition: conditionVar ? paramVar(conditionVar) : paramValue(condition || "$= TODO_填写_条件")
  }, {}, {
    IfSteps: ifSteps,
    ElseSteps: elseSteps
  });
}

export function msgBoxStep(message, title = "请确认", outputVar = "用户选择") {
  return baseStep("sys:MsgBox", {
    operation: paramValue("default"),
    message: paramValue(message || "确定要继续吗？"),
    title: paramValue(title),
    icon: paramValue("Question"),
    buttons: paramValue("OKCancel"),
    restoreFocus: paramValue("1")
  }, {
    result: null,
    okOrYes: outputVar
  });
}

export function groupStep(steps = [], note = "") {
  return baseStep("sys:group", {}, {}, {
    IfSteps: steps,
    ElseSteps: [],
    Note: note || null,
    Collapsed: false
  });
}

export function eachStep(inputVar, itemVar = "item", countVar = "count", steps = []) {
  return baseStep("sys:each", {
    input: paramVar(inputVar || "TODO_填写_列表变量"),
    useMultiThread: paramValue("0"),
    stopIfFail: paramValue("1")
  }, {
    item: itemVar,
    count: countVar,
    isSuccess: null,
    errMessage: null
  }, {
    IfSteps: steps
  });
}

export function repeatStep(count, steps = [], delayMs = 50, options = {}) {
  return baseStep("sys:repeat", {
    count: paramValue(count || "1"),
    stopCondition: paramValue(options.stopCondition || ""),
    startIndex: paramValue(options.startIndex ?? "0"),
    repeatDelayMs: paramValue(delayMs ?? "50"),
    progressBarTitle: paramValue(options.progressBarTitle || "")
  }, {
    count: options.countVar || null
  }, {
    IfSteps: steps
  });
}

export function httpGetStep(url, outputVar = "httpContent", statusVar = "statusCode") {
  return baseStep("sys:http", {
    url: paramValue(url || "TODO_填写_URL"),
    method: paramValue("GET"),
    header: paramValue(""),
    cookie: paramValue(""),
    resultType: paramValue("Text"),
    ua: paramValue("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"),
    expireSeconds: paramValue("10"),
    noAutoRedirect: paramValue("0"),
    showProgress: paramValue("0"),
    skipCertVerify: paramValue("0"),
    forceProxy: paramValue("0"),
    stopIfFail: paramValue("0"),
    useSSE: paramValue("0"),
    sseSpName: paramValue(""),
    bodyType: paramValue("Text"),
    body: paramValue(""),
    contentType: paramValue("text/plain")
  }, {
    isSuccess: null,
    statusCode: statusVar,
    respHeaders: null,
    respCookies: null,
    content: outputVar,
    imgResult: null,
    errMessage: null
  });
}

export function httpRequestStep(options = {}) {
  return baseStep("sys:http", {
    url: inputRef(options.url || "TODO_填写_URL", options.urlVar),
    method: paramValue(options.method || "GET"),
    header: paramValue(options.header || ""),
    cookie: inputRef(options.cookie || "", options.cookieVar),
    bodyType: paramValue(options.bodyType || "Text"),
    body: inputRef(options.body || "", options.bodyVar),
    contentType: paramValue(options.contentType || "text/plain"),
    resultType: paramValue(options.resultType || "Text"),
    ua: paramValue(options.ua || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"),
    expireSeconds: paramValue(options.expireSeconds || "10"),
    noAutoRedirect: paramValue(options.noAutoRedirect || "0"),
    showProgress: paramValue(options.showProgress || "0"),
    skipCertVerify: paramValue(options.skipCertVerify || "0"),
    forceProxy: paramValue(options.forceProxy || "0"),
    stopIfFail: paramValue(options.stopIfFail || "0"),
    useSSE: paramValue(options.useSSE || "0"),
    sseSpName: paramValue(options.sseSpName || "")
  }, {
    isSuccess: null,
    statusCode: options.statusVar || "statusCode",
    respHeaders: null,
    respCookies: null,
    content: options.outputVar || "httpContent",
    imgResult: options.imageVar || null,
    errMessage: null
  });
}

export function enumFilesStep(path, outputVar = "files", searchPattern = "*", recursive = false, pathVar = null) {
  return baseStep("sys:fileOperation", {
    type: paramValue("enumFiles"),
    path: inputRef(path || "TODO_填写_目录路径", pathVar),
    searchPattern: paramValue(searchPattern),
    isAll: paramValue(recursive ? "1" : "0"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    files: outputVar,
    errMessage: null
  });
}

export function moveFilesStep(pathValue, dstPath, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("moveIntoWithShell"),
    path: inputRef(pathValue || "TODO_填写_文件路径", pathVar),
    dstPath: paramValue(dstPath || "TODO_填写_目标目录"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function copyFilesStep(pathValue, dstPath, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("copyIntoWithShell"),
    path: inputRef(pathValue || "TODO_填写_文件路径", pathVar),
    dstPath: paramValue(dstPath || "TODO_填写_目标目录"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function createFolderStep(pathValue, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("makeDir"),
    path: inputRef(pathValue || "TODO_填写_目录路径", pathVar),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: "isSuccess",
    errMessage: null
  });
}

export function enumDirsStep(pathValue, outputVar = "folders", searchPattern = "*", recursive = false) {
  return baseStep("sys:fileOperation", {
    type: paramValue("enumDirs"),
    path: paramValue(pathValue || "TODO_填写_目录路径"),
    searchPattern: paramValue(searchPattern),
    isAll: paramValue(recursive ? "true" : "false"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    files: outputVar,
    errMessage: null
  });
}

export function recyclePathStep(pathValue, pathVar, noUi = false) {
  return baseStep("sys:fileOperation", {
    type: paramValue(noUi ? "recycleNoUi" : "recycle"),
    path: inputRef(pathValue || "TODO_填写_文件或目录路径", pathVar),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function deletePathStep(pathValue, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("deleteFile"),
    path: inputRef(pathValue || "TODO_填写_文件路径", pathVar),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null
  });
}

export function renamePathStep(pathValue, dstPath, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("rename"),
    path: inputRef(pathValue || "TODO_填写_原路径", pathVar),
    dstPath: paramValue(dstPath || "TODO_填写_新路径"),
    overwrite: paramValue("0"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    resultPath: null,
    errMessage: null
  });
}

export function createFileStep(pathValue, pathVar) {
  return baseStep("sys:fileOperation", {
    type: paramValue("createFile"),
    path: inputRef(pathValue || "TODO_填写_文件路径", pathVar),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function getClipboardTextStep(outputVar = "clipboardText") {
  return baseStep("sys:getClipboardText", {
    format: paramValue("UnicodeText"),
    waitMs: paramValue("400"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    output: outputVar,
    url: null,
    elapsedMs: null,
    errMessage: null
  });
}

export function getClipboardFilesStep(outputVar = "files") {
  return baseStep("sys:getClipboardFiles", {
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    output: outputVar,
    elapsedMs: null,
    errMessage: null
  });
}

export function getSelectedTextStep(outputVar = "text", options = {}) {
  return baseStep("sys:getSelectedText", {
    format: paramValue(options.format || "UnicodeText"),
    waitMs: paramValue(options.waitMs || "250"),
    repeat: paramValue(options.repeat || "0"),
    trim: paramValue(options.trim || "0"),
    tryNoClipboard: paramValue(options.tryNoClipboard || "0"),
    useActionParam: paramValue(options.useActionParam || "0"),
    stopIfFail: paramValue(options.stopIfFail || "1")
  }, {
    isSuccess: null,
    output: outputVar,
    outputEncoded: null,
    url: null,
    errMessage: null
  });
}

export function getSelectedFilesStep(outputVar = "files", firstFileVar = "firstFilePath", fileCountVar = "fileCount") {
  return baseStep("sys:getSelectedFiles", {
    operation: paramValue("getSelection"),
    waitMs: paramValue("200"),
    sortType: paramValue("Default"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    files: outputVar,
    firstFile: firstFileVar,
    fileNames: null,
    firstFileName: null,
    fileCount: fileCountVar,
    errMessage: null
  });
}

export function searchBmpStep(options = {}) {
  const searchType = options.searchType || options.operation || (options.type !== "search_bmp" ? options.type : null) || "locateByBitmapFile";
  return baseStep("sys:searchBmp", {
    type: paramValue(searchType),
    bmpTargetType: paramValue(options.bmpTargetType || "MainScreen"),
    bmp: paramValue(options.bmp || "TODO_填写_图片路径"),
    searchRect: paramValue(options.searchRect || ""),
    bmpPosition: paramValue(options.bmpPosition || "Center"),
    x: paramValue(options.x || "0"),
    y: paramValue(options.y || "0"),
    bmpColorError: paramValue(options.bmpColorError || "10"),
    maxFindCount: paramValue(options.maxFindCount || "1"),
    retryCount: paramValue(options.retryCount || "0"),
    ignoreBgColor: paramValue(options.ignoreBgColor || "1"),
    stopIfFail: paramValue(options.stopIfFail || "1")
  }, {
    isSuccess: options.isSuccessVar || "isSuccess",
    firstPoint: options.firstPointVar || "firstPoint",
    allPoints: options.allPointsVar || null,
    imgIndex: options.imgIndexVar || null,
    errMessage: null
  });
}

export function getExplorerPathStep(outputVar = "dir") {
  return baseStep("sys:getExplorerPath", {
    operation: paramValue("getPath"),
    stopIfFail: paramValue("1")
  }, {
    output: outputVar,
    allPathList: null,
    lastPath: null,
    isSuccess: null
  });
}

export function reportProgressStep(options = {}) {
  const progressType = options.progressType || options.operation || (options.type !== "report_progress" ? options.type : null) || "REQUEST_ID";
  return baseStep("sys:reportProgress", {
    type: paramValue(progressType),
    progressId: paramValue(options.progressId || ""),
    title: paramValue(options.title || ""),
    percentage: paramValue(options.percentage || ""),
    text: paramValue(options.text || "")
  }, {
    progressId: options.progressIdVar || "progressId"
  });
}

export function waitKeyboardStep(options = {}) {
  return baseStep("sys:waitKeyboard", {
    operation: paramValue(options.operation || "waitKeyDown"),
    waitingKeys: paramValue(options.waitingKeys || ""),
    modifierKeys: paramValue(options.modifierKeys || ""),
    maxWaitSeconds: paramValue(options.maxWaitSeconds || "0"),
    filterEvent: paramValue(options.filterEvent || "1"),
    ignoreSimulated: paramValue(options.ignoreSimulated || "0"),
    help: paramValue(options.help || ""),
    winLocation: paramValue(options.winLocation || "TopCenter"),
    mouseThrough: paramValue(options.mouseThrough || "1"),
    stopIfFail: paramValue(options.stopIfFail || "1"),
    fontfamily: paramValue(options.fontfamily || "")
  }, {
    isSuccess: null,
    keyCode: options.keyCodeVar || "keyCode",
    keyValue: options.keyValueVar || "keyValue"
  });
}

export function inputScriptStep(data) {
  return baseStep("sys:inputScript", {
    data: paramValue(data || "TODO_填写_脚本"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function runScriptStep(script, options = {}) {
  return baseStep("sys:runScript", {
    script: paramValue(script || "TODO_填写_脚本"),
    type: paramValue(options.runType || "CMD_H"),
    encoding: paramValue(options.encoding || "default"),
    outputEncoding: paramValue(options.outputEncoding || "oem"),
    workingDir: paramValue(options.workingDir || ""),
    runAsAdmin: paramValue(options.runAsAdmin ? "1" : "0"),
    waitToExit: paramValue(options.waitToExit == null ? "0" : options.waitToExit)
  }, {
    stdout: options.stdoutVar || null,
    stdoutOnly: null,
    stderr: null
  });
}

export function continueStep() {
  return baseStep("sys:continue", {}, {});
}

export function breakStep() {
  return baseStep("sys:break", {}, {});
}

export function computeTimeStep(options = {}) {
  const computeType = options.computeType || options.operation || (options.type !== "compute_time" ? options.type : null) || "timespan";
  return baseStep("sys:computeTime", {
    type: paramValue(computeType),
    time1: paramValue(options.time1 || ""),
    time2: paramValue(options.time2 || ""),
    formatString: paramValue(options.formatString || "d\\.hh\\:mm\\:ss"),
    stopIfFail: paramValue(options.stopIfFail || "1")
  }, {
    isSuccess: null,
    totalDays: null,
    totalHours: null,
    totalMinutes: null,
    totalSeconds: options.totalSecondsVar || "totalSeconds",
    textValue: options.textValueVar || null,
    errMessage: null
  });
}

export function getWindowTitleStep(options = {}) {
  return baseStep("sys:getWindowTitle", {
    which: paramValue(options.which || "foreground"),
    winRectIncludeInvisibleBorder: paramValue(options.winRectIncludeInvisibleBorder || "0"),
    stopIfFail: paramValue(options.stopIfFail || "0"),
    className: paramValue(options.className || ""),
    windowName: paramValue(options.windowName || ""),
    procIdOrName: paramValue(options.procIdOrName || ""),
    hWnd: paramValue(options.hWnd || "")
  }, {
    isSuccess: null,
    output: options.outputVar || "windowTitle",
    className: null,
    handle: null,
    pid: null,
    procName: null,
    path: null,
    parent: null,
    root: null,
    rootOwner: null,
    rect: null,
    rectDict: null,
    isTopmost: null,
    allChildWindows: null
  });
}

export function uiAutomationStep(options = {}) {
  const operation = options.operation || options.uiType || (options.type !== "ui_automation" ? options.type : null) || "GetControlInfo";
  return baseStep("sys:uiautomation", {
    type: paramValue(operation),
    window: inputRef(options.window || "", options.windowVar),
    control: inputRef(options.control || "", options.controlVar),
    controlType: paramValue(options.controlType || "50000"),
    controlOperation: paramValue(options.controlOperation || "LeftClick"),
    value: inputRef(options.value || "", options.valueVar),
    stopIfFail: paramValue(options.stopIfFail || "0")
  }, {
    isSuccess: options.isSuccessVar || null,
    value: options.outputVar || options.valueOutputVar || null,
    rect: options.rectVar || null,
    controlName: options.controlNameVar || null,
    controlType: options.controlTypeVar || null,
    controlTypeId: options.controlTypeIdVar || null
  });
}

export function stringProcessStep(options = {}) {
  return baseStep("sys:stringProcess", {
    data: paramVar(options.inputVar || "TODO_填写_文本变量"),
    method: paramValue(options.method || "append"),
    value: paramValue(options.value || ""),
    start: paramValue(options.start || "0"),
    length: paramValue(options.length || "0"),
    stopIfFail: paramValue(options.stopIfFail || "1")
  }, {
    output: options.outputVar || "output",
    isSuccess: null,
    errMessage: null
  });
}

export function strCompareStep(options = {}) {
  return baseStep("sys:strCompare", {
    param1: inputRef(options.param1 || "", options.param1Var),
    type: paramValue(options.compareType || options.comparison || options.matchType || "match"),
    param2: inputRef(options.param2 || "", options.param2Var),
    case: paramValue(options.case || "0")
  }, {
    value: options.outputVar || "value"
  });
}

export function genTempFilePathStep(options = {}) {
  return baseStep("sys:GenTempFilePath", {
    ext: paramValue(options.ext || ".txt")
  }, {
    filePath: options.outputVar || "filePath"
  });
}

export function quickerOperationsStep(options = {}) {
  const operation = options.operation || options.quickerType || (options.type !== "quicker_operations" ? options.type : null) || "showSearch";
  return baseStep("sys:quickeroperations", {
    type: paramValue(operation),
    searchText: paramValue(options.searchText || ""),
    skinId: paramValue(options.skinId || ""),
    theme: paramValue(options.theme || ""),
    viewMode: paramValue(options.viewMode || ""),
    stopIfFail: paramValue(options.stopIfFail || "1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function formStep(options = {}) {
  return baseStep("sys:form", {
    operation: paramValue(options.operation || "variables"),
    title: paramValue(options.title || "填写表单"),
    formDef: paramValue(options.formDef || ""),
    help: paramValue(options.help || ""),
    titleColumnWidth: paramValue(options.titleColumnWidth || "100"),
    windowWidth: paramValue(options.windowWidth || "500"),
    restoreFocus: paramValue(options.restoreFocus || "0"),
    topMost: paramValue(options.topMost || "false"),
    stopIfFail: paramValue(options.stopIfFail || "1"),
    markdownhelp: paramValue(options.markdownhelp || "")
  }, {
    isSuccess: null,
    button: options.buttonVar || null
  });
}

export function checkPathExistsStep(pathValue, outputVar = "isExists", pathVar) {
  return baseStep("sys:checkPathExists", {
    path: inputRef(pathValue || "TODO_填写_路径", pathVar)
  }, {
    isExists: outputVar,
    isFile: null,
    fileLength: null,
    isFolder: null,
    isReadonly: null,
    isHidden: null,
    isSystem: null,
    fileCount: null,
    totalLength: null,
    createTime: null,
    editTime: null,
    metaData: null,
    lnkTarget: null,
    lnkArguments: null,
    md5hash: null,
    sha1hash: null,
    sha256hash: null,
    crc32hash: null
  });
}

export function pathInfoStep(pathValue, pathVar, outputs = {}) {
  return baseStep("sys:pathExtraction", {
    operation: paramValue("getInfo"),
    path: inputRef(pathValue || "TODO_填写_路径", pathVar),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    name: outputs.name || null,
    nameNoExt: outputs.nameNoExt || null,
    ext: outputs.ext || null,
    path: outputs.folderPath || outputs.path || null,
    errMessage: null
  });
}

export function listOperationStep(listVar, operation = "append", itemValue, itemVar, options = {}) {
  return baseStep("sys:listOperations", {
    list: paramVar(listVar || "TODO_填写_列表变量"),
    type: paramValue(operation),
    item: inputRef(itemValue || "", itemVar),
    pattern: paramValue(options.pattern || ""),
    list2: inputRef(options.list2 || "", options.list2Var),
    pos: paramValue(options.pos || "0"),
    length: paramValue(options.length || "0")
  }, {
    isEmpty: null,
    length: null,
    value: null,
    index: null
  });
}

export function splitStringStep(inputVar, separator = "\\r\\n", outputVar = "list", removeEmpty = true) {
  return baseStep("sys:splitString", {
    data: paramVar(inputVar || "TODO_填写_文本变量"),
    separator: paramValue(separator),
    escapeSeparator: paramValue("1"),
    multiSeparator: paramValue("0"),
    removeEmpty: paramValue(removeEmpty ? "1" : "0")
  }, {
    output: outputVar
  });
}

export function joinListStep(listVar, separator = "", outputVar = "output") {
  return baseStep("sys:joinList", {
    list: paramVar(listVar || "TODO_填写_列表变量"),
    separator: paramValue(separator),
    escapeSeparator: paramValue("0")
  }, {
    output: outputVar
  });
}

export function replaceTextStep(inputVar, oldValue, newValue = "", outputVar = inputVar, useRegex = false) {
  return baseStep("sys:strReplace", {
    type: paramValue("single"),
    input: paramVar(inputVar || "TODO_填写_文本变量"),
    batchReplaceData: paramValue(""),
    old: paramValue(oldValue || "TODO_填写_查找内容"),
    new: paramValue(newValue),
    escapeOld: paramValue("1"),
    replaceEscapes: paramValue("1"),
    useRegex: paramValue(useRegex ? "1" : "0"),
    ignoreCase: paramValue("0"),
    singleLine: paramValue("1"),
    multiLine: paramValue("0")
  }, {
    output: outputVar || inputVar || "output"
  });
}

export function regexExtractStep(inputVar, pattern, outputVar = "matches") {
  return baseStep("sys:regexExtract", {
    getGroup: paramValue("0"),
    data: paramVar(inputVar || "TODO_填写_文本变量"),
    pattern: paramValue(pattern || "TODO_填写_正则"),
    ignoreCase: paramValue("true"),
    singleLine: paramValue("false"),
    multiLine: paramValue("false"),
    rightToLeft: paramValue("false"),
    stopIfFail: paramValue("0")
  }, {
    matches: outputVar,
    "match1 ": null,
    "match2 ": null,
    "match3 ": null,
    "match4 ": null,
    "match5 ": null,
    matchesCollection: null,
    isSuccess: null,
    errMessage: null
  });
}

export function readTextFileStep(pathValue, pathVar, outputVar = "text") {
  return baseStep("sys:readFile", {
    path: inputRef(pathValue || "TODO_填写_文件路径", pathVar),
    type: paramValue("text"),
    stopIfFail: paramValue("1")
  }, {
    text: outputVar,
    isSuccess: null
  });
}

export function writeTextFileStep(filePath, content, filePathVar, contentVar, append = false) {
  return baseStep("sys:WriteTextFile", {
    content: inputRef(content || "TODO_填写_文本内容", contentVar),
    filePath: inputRef(filePath || "TODO_填写_文件路径", filePathVar),
    encoding: paramValue("utf-8"),
    addUtf8Bom: paramValue("0"),
    appendMode: paramValue(append ? "1" : "0"),
    addNewLine: paramValue("1"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null
  });
}

export function formatStringStep(formatString, params = [], outputVar = "output") {
  const inputParams = {
    formatString: paramValue(formatString || "TODO_填写_格式字符串")
  };
  for (let i = 0; i < 5; i += 1) {
    const param = params[i];
    inputParams[`p${i}`] = param?.varKey ? paramVar(param.varKey) : paramValue(param?.value || "");
  }
  return baseStep("sys:formatString", inputParams, {
    output: outputVar
  });
}

export function getCurrentTimeStep(format = "yyyyMMdd", outputVar = "now") {
  return baseStep("sys:getCurrentTime", {
    source: paramValue("currTime"),
    useUtc: paramValue("0"),
    addDays: paramValue("0"),
    addHours: paramValue("0"),
    addMinutes: paramValue("0"),
    addSeconds: paramValue("0"),
    addMonths: paramValue("0"),
    format: paramValue(format),
    outputCulture: paramValue("CURRENT"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    output: null,
    strValue: outputVar,
    timeStamp: null,
    timeStampMs: null,
    year: null,
    month: null,
    day: null,
    hour: null,
    minute: null,
    second: null,
    dayOfWeek: null,
    dayOfYear: null,
    errMessage: null
  });
}

export function jsonExtractStep(inputVar, paths = [], outputVars = []) {
  const inputParams = {
    data: paramVar(inputVar || "TODO_填写_JSON变量")
  };
  const outputParams = {};
  for (let i = 0; i < 5; i += 1) {
    inputParams[`p${i}`] = paramValue(paths[i] || "");
    outputParams[`v${i}`] = outputVars[i] || null;
  }
  return baseStep("sys:jsonExtract", inputParams, outputParams);
}

export function showTextStep(text, textVar, title = "文本内容") {
  return baseStep("sys:showText", {
    type: paramValue("WAIT"),
    text: inputRef(text || "", textVar),
    title: paramValue(title),
    topMost: paramValue("false"),
    stopIfFail: paramValue("1"),
    operations: paramValue(""),
    autoCloseKey: paramValue(""),
    winLocation: paramValue("CenterScreen"),
    winSize: paramValue(""),
    fontsize: paramValue("14"),
    fontfamily: paramValue(""),
    bgColor: paramValue(""),
    textColor: paramValue(""),
    highlight: paramValue(""),
    autoSaveToState: paramValue(""),
    closeWhenLostFocus: paramValue("false"),
    showLineNum: paramValue("true"),
    autoWrap: paramValue("true"),
    showBuildInToolbar: paramValue("true"),
    copyWholeLine: paramValue("false"),
    caretPosition: paramValue("0")
  }, {
    isSuccess: null,
    selectedOperation: null,
    resultText: null,
    selectedText: null,
    windowPosition: null
  });
}

export function outputTextStep(text, textVar) {
  return baseStep("sys:outputText", {
    content: inputRef(text || "TODO_填写_输出文本", textVar),
    method: paramValue("paste"),
    delayBeforePaste: paramValue("50"),
    delayAfterPaste: paramValue("10"),
    appendReturn: paramValue("0"),
    hideInHistory: paramValue("0"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  });
}

export function subprogramStep(name, outputs = {}) {
  const outputParams = {
    isSuccess: null,
    errMessage: null
  };
  for (const [key, value] of Object.entries(outputs || {})) {
    outputParams[`var:${key}`] = value;
  }
  return baseStep("sys:subprogram", {
    subProgram: paramValue(name || "TODO_填写_子程序名称"),
    stopIfFail: paramValue("1"),
    skipDebugOutput: paramValue("1"),
    summary: paramValue("")
  }, outputParams);
}

export function runActionStep(actionId, inputParam = "", outputVar = null) {
  return baseStep("sys:runAction", {
    type: paramValue("StartAction"),
    actionId: paramValue(actionId || "TODO_填写_动作ID"),
    inputParam: paramValue(inputParam || ""),
    wait: paramValue("1"),
    debug: paramValue("0"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    actionTitle: null,
    output: outputRef(outputVar)
  });
}

export function downloadStep(url, savePath, saveName = "", options = {}) {
  return baseStep("sys:download", {
    url: inputRef(url || "TODO_填写_URL", options.urlVar),
    savePath: paramValue(savePath || "TODO_填写_保存目录"),
    saveName: paramValue(saveName || ""),
    ua: paramValue(options.ua || ""),
    header: paramValue(options.header || ""),
    cookie: inputRef(options.cookie || "", options.cookieVar),
    expireSeconds: paramValue(options.expireSeconds || "10"),
    showProgress: paramValue(options.showProgress === false ? "0" : "1"),
    autoRename: paramValue(options.autoRename ? "1" : "0"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: options.successVar || "isSuccess",
    savedPath: options.savedPathVar || null
  });
}

export function windowOperationStep(operation = "close", hWnd = "$={mainWinHandle}") {
  return baseStep("sys:windowOperations", {
    type: paramValue(operation),
    hWnd: paramValue(hWnd),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    errMessage: null
  }, { DelayMs: 100 });
}

export function audioControlStep(operation = "GetOutputDefaultDevice", options = {}) {
  const inputParams = {
    operation: paramValue(operation),
    stopIfFail: paramValue("1")
  };
  if (options.deviceId) inputParams.id = paramValue(options.deviceId);
  if (options.volume != null) inputParams.volume = paramValue(options.volume);
  if (options.mute != null) inputParams.mute = paramValue(options.mute ? "true" : "false");
  return baseStep("sys:audioControl", inputParams, {
    isSuccess: null,
    deviceId: options.deviceIdVar || "deviceId",
    deviceName: null,
    deviceState: null,
    mute: null,
    isPlaying: null,
    volume: null,
    masterPeakValue: null,
    deviceObject: null,
    errMessage: null
  });
}

export function keyOperationStep(key = "Escape", outputVar = "isDown") {
  return baseStep("sys:keyoperation", {
    type: paramValue("get_key_state"),
    key: paramValue(key),
    getRealMouseState: paramValue("0")
  }, {
    isDown: outputVar,
    isToggled: null
  });
}

export function getActiveProcessInfoStep(outputVar = "procName") {
  return baseStep("sys:getActiveProcessInfo", {
    stopIfFail: paramValue("1")
  }, {
    path: null,
    procName: outputVar,
    pid: null,
    isSuccess: null
  });
}

export function getFolderPathStep(folder = "Desktop", outputVar = "dir") {
  return baseStep("sys:getFolderPath", {
    folder: paramValue(folder)
  }, {
    path: outputVar
  });
}

export function runProgramStep(pathValue, args = "", runAsAdmin = false, options = {}) {
  const waitExit = options.waitExit === true || options.waitExit === "true" || options.waitExit === 1 || options.waitExit === "1";
  const stopIfFail = options.stopIfFail === false || options.stopIfFail === "0" || options.stopIfFail === 0 ? "0" : "1";
  return baseStep("sys:run", {
    path: paramValue(pathValue || "TODO_填写_程序路径"),
    arg: paramValue(args || ""),
    runas: paramValue(runAsAdmin ? "true" : "false"),
    activateWindowIfRunning: paramValue("false"),
    activateWindowHotkey: paramValue(""),
    alternativePath: paramValue(""),
    stopIfFail: paramValue(stopIfFail),
    setWorkingDir: paramValue(options.workingDir || ""),
    windowStyle: paramValue("0"),
    waitInputIdle: paramValue("false"),
    waitExit: paramValue(waitExit ? "true" : "false"),
    username: paramValue(""),
    password: paramValue(""),
    outputEncoding: paramValue("utf8")
  }, {
    isSuccess: options.successVar || null,
    pid: options.pidVar || null,
    mainWinHandle: options.mainWinHandleVar || null,
    mainWinTitle: options.mainWinTitleVar || null,
    stdout: options.stdoutVar || null,
    stdoutOnly: options.stdoutOnlyVar || null,
    stderr: options.stderrVar || null,
    exitCode: options.exitCodeVar || null
  });
}

export function assignStep(expression, outputVar = "output") {
  return baseStep("sys:assign", {
    input: paramValue(expression || "$= TODO_填写_表达式"),
    stopIfFail: paramValue("1")
  }, {
    isSuccess: null,
    output: outputVar,
    errMessage: null
  });
}
