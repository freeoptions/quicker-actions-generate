import { makeActionShell, makeOpenAppAction } from "./quicker.js";
import {
  assignStep,
  breakStep,
  checkPathExistsStep,
  commentStep,
  computeTimeStep,
  continueStep,
  copyFilesStep,
  createFileStep,
  createFolderStep,
  delayStep,
  deletePathStep,
  downloadStep,
  enumDirsStep,
  enumFilesStep,
  eachStep,
  formatStringStep,
  getActiveProcessInfoStep,
  getClipboardFilesStep,
  getClipboardTextStep,
  getCurrentTimeStep,
  getExplorerPathStep,
  getFolderPathStep,
  getSelectedTextStep,
  getWindowTitleStep,
  getSelectedFilesStep,
  groupStep,
  httpGetStep,
  httpRequestStep,
  inputScriptStep,
  joinListStep,
  jsonExtractStep,
  keyInputByCodesStep,
  keyOperationStep,
  listOperationStep,
  msgBoxStep,
  mouseStep,
  mouseClickStep,
  moveFilesStep,
  notifyStep,
  openUrlStep,
  outputTextStep,
  pathInfoStep,
  quickerOperationsStep,
  readTextFileStep,
  recyclePathStep,
  regexExtractStep,
  renamePathStep,
  reportProgressStep,
  repeatStep,
  replaceTextStep,
  runProgramStep,
  runScriptStep,
  runActionStep,
  searchBmpStep,
  selectStep,
  showTextStep,
  simpleIfStep,
  stopStep,
  stringProcessStep,
  subprogramStep,
  splitStringStep,
  todoStep,
  userInputStep,
  userInputStepRich,
  audioControlStep,
  formStep,
  genTempFilePathStep,
  strCompareStep,
  uiAutomationStep,
  waitKeyboardStep,
  windowOperationStep,
  writeClipboardStep,
  writeClipboardStepRich,
  writeTextFileStep
} from "./steps.js";

function normalizePlan(plan, prompt) {
  if (!plan || typeof plan !== "object") {
    return {
      title: "AI生成动作",
      description: "",
      steps: [{ type: "todo", message: `无法解析需求：${prompt}` }]
    };
  }
  return {
    title: plan.title || "AI生成动作",
    description: plan.description || "",
    steps: Array.isArray(plan.steps) ? plan.steps : []
  };
}

function isVariableName(value) {
  return typeof value === "string"
    && value.trim()
    && !value.startsWith("TODO_")
    && !value.startsWith("[")
    && !value.includes("\\")
    && !value.includes("/")
    && !value.includes("$")
    && !value.includes("\r")
    && !value.includes("\n");
}

function createVariable(key, type = 0) {
  return {
    Key: key,
    IsLocked: false,
    Type: type,
    Desc: "",
    DefaultValue: "",
    SaveState: false,
    IsInput: false,
    IsOutput: false,
    ParamName: "",
    InputParamInfo: null,
    OutputParamInfo: null,
    TableDef: null,
    CustomType: null,
    Group: ""
  };
}

function variableTypePriority(type) {
  if (type === 4) return 40;
  if (type === 2) return 30;
  if (type === 12) return 20;
  if (type === 1) return 10;
  return 0;
}

function addVariable(vars, key, type = 0) {
  if (!isVariableName(key)) {
    return;
  }
  const current = vars.get(key);
  if (!current || variableTypePriority(type) > variableTypePriority(current)) {
    vars.set(key, type);
  }
}

function addOutputObjectVars(vars, outputs) {
  if (!outputs || typeof outputs !== "object") {
    return;
  }
  for (const value of Object.values(outputs)) {
    addVariable(vars, value, 0);
  }
}

function collectPlanVariables(steps, vars = new Map()) {
  for (const step of steps || []) {
    switch (step?.type) {
      case "select":
        addVariable(
          vars,
          step.outputVar || (step.mode === "multi" ? "multiSelected" : "choice"),
          step.mode === "multi" ? 4 : 0
        );
        for (const branch of step.branches || []) collectPlanVariables(branch.steps, vars);
        break;
      case "confirm":
      case "check_path_exists":
      case "key_state":
        addVariable(vars, step.outputVar, 2);
        break;
      case "enum_files":
      case "enum_dirs":
      case "get_selected_files":
      case "split_string":
      case "regex_extract":
        addVariable(vars, step.outputVar, 4);
        addVariable(vars, step.pathVar, 0);
        if (step.firstFileVar) addVariable(vars, step.firstFileVar, 0);
        if (step.fileCountVar) addVariable(vars, step.fileCountVar, 12);
        break;
      case "each":
        addVariable(vars, step.inputVar, 4);
        addVariable(vars, step.itemVar || "item", 0);
        addVariable(vars, step.countVar || "count", 12);
        collectPlanVariables(step.steps, vars);
        break;
      case "repeat":
        addVariable(vars, step.countVar, 12);
        collectPlanVariables(step.steps, vars);
        break;
      case "group":
        collectPlanVariables(step.steps, vars);
        break;
      case "list_append":
      case "list_remove_all_by_value":
        addVariable(vars, step.listVar, 4);
        addVariable(vars, step.itemVar, 0);
        break;
      case "if":
        collectPlanVariables(step.ifSteps, vars);
        collectPlanVariables(step.elseSteps, vars);
        break;
      case "path_info":
        addVariable(vars, step.pathVar, 0);
        addOutputObjectVars(vars, step.outputs);
        break;
      case "json_extract":
        for (const value of step.outputVars || []) addVariable(vars, value, 0);
        break;
      case "download":
        addVariable(vars, step.urlVar, 0);
        addVariable(vars, step.cookieVar, 0);
        addVariable(vars, step.successVar, 2);
        addVariable(vars, step.savedPathVar, 0);
        break;
      case "run_program":
        addVariable(vars, step.successVar, 2);
        addVariable(vars, step.exitCodeVar, 12);
        addVariable(vars, step.pidVar, 12);
        addVariable(vars, step.mainWinHandleVar, 12);
        addVariable(vars, step.mainWinTitleVar, 0);
        addVariable(vars, step.stdoutVar, 0);
        addVariable(vars, step.stdoutOnlyVar, 0);
        addVariable(vars, step.stderrVar, 0);
        break;
      default:
        addVariable(vars, step?.outputVar, step?.outputType ?? 0);
        addVariable(vars, step?.inputVar, 0);
        addVariable(vars, step?.pathVar, 0);
        addVariable(vars, step?.textVar, 0);
        addVariable(vars, step?.contentVar, 0);
        addVariable(vars, step?.filePathVar, 0);
        addVariable(vars, step?.varKey, 0);
        addVariable(vars, step?.statusVar, 12);
        break;
    }
  }
  return vars;
}

function collectBuiltStepVariables(steps, vars) {
  for (const step of steps || []) {
    for (const param of Object.values(step.InputParams || {})) {
      addVariable(vars, param?.VarKey, 0);
    }
    for (const value of Object.values(step.OutputParams || {})) {
      addVariable(vars, value, 0);
    }
    collectBuiltStepVariables(step.IfSteps, vars);
    collectBuiltStepVariables(step.ElseSteps, vars);
  }
}

function buildVariables(plan, builtSteps) {
  const vars = collectPlanVariables(plan.steps);
  collectBuiltStepVariables(builtSteps, vars);
  return Array.from(vars.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
    .map(([key, type]) => createVariable(key, type));
}

export function buildAction(planInput, prompt, options = {}) {
  const plan = normalizePlan(planInput, prompt);

  if (
    plan.steps.length === 1 &&
    plan.steps[0].type === "open_app" &&
    plan.steps[0].fileName
  ) {
    return makeOpenAppAction(plan.title, plan.steps[0].fileName, plan.steps[0].args || "", options.icon);
  }

  const steps = plan.steps.length ? buildSteps(plan.steps) : [
    todoStep(`未能从需求中拆出步骤：${prompt}`)
  ];
  const variables = buildVariables(plan, steps);

  return makeActionShell(plan.title, plan.description, steps, variables, options.icon);
}

function buildSteps(steps) {
  return (steps || []).flatMap((step) => buildStep(step));
}

function quoteChoice(value) {
  const raw = String(value ?? "");
  if (/^-?\d+(\.\d+)?$|^true$|^false$/i.test(raw)) {
    return raw;
  }
  return JSON.stringify(raw);
}

function buildStep(step) {
  switch (step?.type) {
    case "open_app":
      return [runProgramStep(step.fileName, step.args, Boolean(step.runAsAdmin))];
    case "run_program":
      return [runProgramStep(step.path, step.args, Boolean(step.runAsAdmin), step)];
    case "open_url":
      return [openUrlStep(step.url, step.browser)];
    case "comment":
      return [commentStep(step.message || "")];
    case "group":
      return [groupStep(buildSteps(step.steps || []), step.note)];
    case "select": {
      const outputVar = step.outputVar || (step.mode === "multi" ? "multiSelected" : "choice");
      const select = selectStep({ ...step, outputVar });
      const branches = Array.isArray(step.branches) ? step.branches : [];
      const branchSteps = branches.map((branch) => {
        const values = Array.isArray(branch.when) ? branch.when : [branch.when ?? branch.value];
        const conditionParts = values.map((value) => {
          if (step.mode === "multi") {
            return `{${outputVar}}.Contains(${JSON.stringify(String(value ?? ""))})`;
          }
          return `{${outputVar}} == ${quoteChoice(value)}`;
        });
        return simpleIfStep(`$= ${conditionParts.join(" || ")}`, buildSteps(branch.steps || []));
      });
      return [select, ...branchSteps];
    }
    case "if":
      return [simpleIfStep(step.condition, buildSteps(step.ifSteps || []), step.elseSteps ? buildSteps(step.elseSteps) : null, step.conditionVar)];
    case "confirm":
      return [msgBoxStep(step.message, step.title, step.outputVar)];
    case "key_input":
      return [keyInputByCodesStep(step.keys || [], step.ctrlKeys || [], step.delayMs)];
    case "key_state":
      return [keyOperationStep(step.key, step.outputVar)];
    case "write_clipboard":
      return [writeClipboardStepRich(step.text, step.varKey, step)];
    case "get_clipboard_text":
      return [getClipboardTextStep(step.outputVar)];
    case "get_clipboard_files":
      return [getClipboardFilesStep(step.outputVar)];
    case "get_selected_text":
      return [getSelectedTextStep(step.outputVar, step)];
    case "get_selected_files":
      return [getSelectedFilesStep(step.outputVar, step.firstFileVar, step.fileCountVar)];
    case "get_explorer_path":
      return [getExplorerPathStep(step.outputVar)];
    case "get_window_title":
      return [getWindowTitleStep(step)];
    case "get_active_process_info":
      return [getActiveProcessInfoStep(step.outputVar)];
    case "get_folder_path":
      return [getFolderPathStep(step.folder, step.outputVar)];
    case "check_path_exists":
      return [checkPathExistsStep(step.path, step.outputVar, step.pathVar)];
    case "path_info":
      return [pathInfoStep(step.path, step.pathVar, step.outputs || {})];
    case "each":
      return [eachStep(step.inputVar, step.itemVar, step.countVar, buildSteps(step.steps || []))];
    case "repeat":
      return [repeatStep(step.count, buildSteps(step.steps || []), step.delayMs, step)];
    case "list_append":
      return [listOperationStep(step.listVar, "append", step.item, step.itemVar)];
    case "list_remove_all_by_value":
      return [listOperationStep(step.listVar, "removeAllByValue", step.item, step.itemVar)];
    case "list_operation":
      return [listOperationStep(step.listVar, step.operation || step.listOperation || step.action, step.item, step.itemVar, step)];
    case "split_string":
      return [splitStringStep(step.inputVar, step.separator, step.outputVar, step.removeEmpty !== false)];
    case "join_list":
      return [joinListStep(step.listVar, step.separator, step.outputVar)];
    case "replace_text":
      return [replaceTextStep(step.inputVar, step.oldValue, step.newValue, step.outputVar, Boolean(step.useRegex))];
    case "string_process":
      return [stringProcessStep(step)];
    case "str_compare":
      return [strCompareStep(step)];
    case "regex_extract":
      return [regexExtractStep(step.inputVar, step.pattern, step.outputVar)];
    case "format_string":
      return [formatStringStep(step.formatString, step.params || [], step.outputVar)];
    case "json_extract":
      return [jsonExtractStep(step.inputVar, step.paths || [], step.outputVars || [])];
    case "get_current_time":
      return [getCurrentTimeStep(step.format, step.outputVar)];
    case "show_text":
      return [showTextStep(step.text, step.textVar, step.title)];
    case "output_text":
      return [outputTextStep(step.text, step.textVar)];
    case "user_input":
      return [userInputStepRich(step.outputVar, step.prompt, step.multiline !== false, step)];
    case "http_get":
      return [httpGetStep(step.url, step.outputVar, step.statusVar)];
    case "http_request":
      return [httpRequestStep(step)];
    case "mouse_click":
      return [mouseClickStep(step.x, step.y, step.delayMs, step.action || step.extAction)];
    case "mouse":
      return [mouseStep(step)];
    case "search_bmp":
      return [searchBmpStep(step)];
    case "delay":
      return [delayStep(step.delayMs)];
    case "enum_files":
      return [enumFilesStep(step.path, step.outputVar, step.searchPattern, Boolean(step.recursive), step.pathVar)];
    case "enum_dirs":
      return [enumDirsStep(step.path, step.outputVar, step.searchPattern, Boolean(step.recursive))];
    case "create_folder":
      return [createFolderStep(step.path, step.pathVar)];
    case "copy_files":
      return [copyFilesStep(step.path, step.dstPath, step.pathVar)];
    case "move_files":
      return [moveFilesStep(step.path, step.dstPath, step.pathVar)];
    case "recycle_path":
      return [recyclePathStep(step.path, step.pathVar, Boolean(step.noUi))];
    case "delete_path":
      return [deletePathStep(step.path, step.pathVar)];
    case "rename_path":
      return [renamePathStep(step.path, step.dstPath, step.pathVar)];
    case "create_file":
      return [createFileStep(step.path, step.pathVar)];
    case "read_text_file":
      return [readTextFileStep(step.path, step.pathVar, step.outputVar)];
    case "write_text_file":
      return [writeTextFileStep(step.path, step.content, step.pathVar, step.contentVar, Boolean(step.append))];
    case "subprogram":
      return [subprogramStep(step.name, step.outputs || {})];
    case "run_action":
      return [runActionStep(step.actionId, step.inputParam, step.outputVar)];
    case "download":
      return [downloadStep(step.url, step.savePath, step.saveName, step)];
    case "report_progress":
      return [reportProgressStep(step)];
    case "wait_keyboard":
      return [waitKeyboardStep(step)];
    case "input_script":
      return [inputScriptStep(step.data)];
    case "run_script":
      return [runScriptStep(step.script, step)];
    case "continue":
      return [continueStep()];
    case "break":
      return [breakStep()];
    case "compute_time":
      return [computeTimeStep(step)];
    case "gen_temp_file_path":
      return [genTempFilePathStep(step)];
    case "quicker_operations":
      return [quickerOperationsStep(step)];
    case "form":
      return [formStep(step)];
    case "ui_automation":
      return [uiAutomationStep(step)];
    case "window_operation":
      return [windowOperationStep(step.operation, step.hWnd)];
    case "audio_control":
      return [audioControlStep(step.operation, step)];
    case "assign":
      return [assignStep(step.expression, step.outputVar)];
    case "notify":
      return [notifyStep(
        step.message || "完成",
        step.notifyType || step.notificationType || (step.type !== "notify" ? step.type : null) || "Success"
      )];
    case "stop":
      return [stopStep(step.message || "", Boolean(step.isError))];
    case "todo":
      return [todoStep(step.message || "缺少真实样本，未生成该步骤")];
    default:
      return [todoStep(`未知步骤类型 ${step?.type || "空步骤"}，未生成假积木`)];
  }
}
