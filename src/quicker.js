import crypto from "node:crypto";

const DEFAULT_ICON = "https://files.getquicker.net/_icons/88F67AD869B3C4C445F2473DF6A4DDF0AEFC881C.png";

export function paramValue(value) {
  return { VarKey: null, Value: value == null ? "" : String(value) };
}

export function paramVar(varKey) {
  return { VarKey: varKey, Value: null };
}

export function baseStep(stepRunnerKey, inputParams = {}, outputParams = {}, extra = {}) {
  return {
    StepRunnerKey: stepRunnerKey,
    InputParams: inputParams,
    OutputParams: outputParams,
    IfSteps: extra.IfSteps ?? null,
    ElseSteps: extra.ElseSteps ?? null,
    Note: extra.Note ?? "",
    Disabled: extra.Disabled ?? false,
    Collapsed: extra.Collapsed ?? false,
    DelayMs: extra.DelayMs ?? 0
  };
}

export function makeActionShell(title, description, steps, variables = [], icon = DEFAULT_ICON) {
  const now = new Date().toISOString();
  return {
    Row: 0,
    Col: 0,
    ActionType: 24,
    Title: title || "AI生成动作",
    Description: description || "",
    Icon: icon || DEFAULT_ICON,
    Path: null,
    DelayMs: 0,
    Data: JSON.stringify({
      LimitSingleInstance: true,
      SummaryExpression: "$$",
      SubPrograms: [],
      Variables: variables,
      Steps: steps
    }),
    Data2: null,
    Data3: null,
    Children: [],
    Id: crypto.randomUUID(),
    TemplateId: null,
    TemplateRevision: 0,
    UseTemplate: false,
    LastEditTimeUtc: now,
    SharedActionId: "",
    ShareTimeUtc: null,
    CreateTimeUtc: now,
    AsSubProgram: false,
    SkipWhenStopRunningActions: false,
    SkipCheckUpdate: false,
    AutoUpdate: false,
    KeepInfoWhenUpdate: false,
    MinQuickerVersion: "",
    ContextMenuData: null,
    AllowScrollTrigger: false,
    EnableEvaluateVariable: true,
    IsTextProcessor: false,
    IsImageProcessor: false,
    Association: {
      MatchProcess: null,
      IsImageProcessor: false,
      ReturnImageFromFirstScreenShotStep: true,
      IsTextProcessor: false,
      ReturnTextFromGetSelectedTextStep: true,
      TextMatchExpression: "",
      TextMinLength: 0,
      TextMaxLength: 0,
      IsHtmlProcessor: false,
      IsFileProcessor: false,
      FileMinCount: 0,
      FileMaxCount: 0,
      AllowedFileExtensions: "",
      RequireAllFileMatchExt: false,
      SearchBoxPlaceholder: "",
      IsWindowProcessor: false,
      EnableRealtimeSearch: false,
      BrowserContextMenu: null,
      UrlPattern: ""
    },
    DoNotClosePanel: false,
    UserLimitation: 0
  };
}

export function makeOpenAppAction(title, fileName, args = "", icon = DEFAULT_ICON) {
  const now = new Date().toISOString();
  return {
    Row: 0,
    Col: 0,
    ActionType: 11,
    Title: title || "打开软件",
    Description: `打开 「${fileName}」`,
    Icon: icon || DEFAULT_ICON,
    Path: null,
    DelayMs: 0,
    Data: `json:${JSON.stringify({
      FileName: fileName,
      Arguments: args,
      RunAsAdmin: false,
      WaitForExit: false,
      WindowStyle: null,
      SetWorkingDir: false,
      WorkingDir: "",
      AlternativePaths: "",
      ActivateWindowIfRunning: false,
      ActivateWindowHotkey: ""
    })}`,
    Data2: "",
    Data3: "",
    Children: null,
    Id: crypto.randomUUID(),
    TemplateId: null,
    TemplateRevision: 0,
    UseTemplate: false,
    LastEditTimeUtc: now,
    SharedActionId: null,
    ShareTimeUtc: null,
    CreateTimeUtc: now,
    AsSubProgram: false,
    SkipWhenStopRunningActions: false,
    SkipCheckUpdate: false,
    AutoUpdate: false,
    KeepInfoWhenUpdate: false,
    MinQuickerVersion: null,
    ContextMenuData: null,
    AllowScrollTrigger: false,
    EnableEvaluateVariable: true,
    IsTextProcessor: false,
    IsImageProcessor: false,
    Association: null,
    DoNotClosePanel: null,
    UserLimitation: null
  };
}
