import { fallbackPlan, inferSelectPlan, inferMousePlan } from "./fallbackPlanner.js";

const SYSTEM_PROMPT = `你是 Quicker 动作草稿规划器，只输出严格 JSON。
目标：把用户自然语言拆成中间 DSL。不要输出 Quicker 原始 JSON。
只能使用这些 type：
- open_app: 打开软件。字段 title,fileName,args
- run_program: 运行程序或命令。字段 path,args,runAsAdmin
- open_url: 打开网页。字段 url,browser
- comment: 注释。字段 message
- select: 用户选择。字段 mode,prompt,outputVar,items,branches
  - mode: single 或 multi
  - items: [{"label":"显示文本","value":"分支值"}]
  - branches: [{"when":"分支值","steps":[...]}]
  - 单选分支会生成 sys:select + sys:simpleIf；多选分支会生成 Contains 条件。
  - 例如“选择 a 打开百度，选择 b 打开飞书，选择 c 不执行”必须用 select，不能用 user_input + assign。
- if: 条件分支。字段 condition,ifSteps,elseSteps。condition 使用 Quicker 表达式，例如 "$= {choice} == \"a\""
- confirm: 弹确认框。字段 message,title,outputVar。用于“是否继续/确认删除/确认移动”等。
- write_clipboard: 写剪贴板。字段 text,varKey,clipType,imageVar,html,htmlVar,textVar,successMsg。clipType 可取 auto/text/image/html
- get_clipboard_text: 获取剪贴板文本。字段 outputVar
- get_clipboard_files: 获取剪贴板文件。字段 outputVar
- get_selected_files: 获取当前选中文件。字段 outputVar,firstFileVar,fileCountVar
- get_explorer_path: 获取当前资源管理器路径。字段 outputVar
- check_path_exists: 检查路径/获取文件信息。字段 path,pathVar,outputVar
- path_info: 解析路径信息。字段 path,pathVar,outputs；outputs 可含 name,nameNoExt,ext,folderPath。
- user_input: 用户输入。字段 prompt,outputVar,multiline
- http_get: HTTP GET。字段 url,outputVar,statusVar
- http_request: HTTP 请求。字段 url,method,header,cookie,bodyType,body,contentType,resultType,outputVar,statusVar
- get_selected_text: 获取选中文本。字段 outputVar,format,waitMs,repeat,trim,tryNoClipboard,useActionParam
- search_bmp: 找图。字段 searchType,bmp,bmpTargetType,searchRect,bmpPosition,x,y,bmpColorError,maxFindCount,retryCount,ignoreBgColor,outputVar
- report_progress: 进度条。字段 progressType,progressId,title,percentage,text
- wait_keyboard: 等待按键。字段 operation,waitingKeys,modifierKeys,maxWaitSeconds,filterEvent,ignoreSimulated,help,outputVar
- input_script: 输入脚本。字段 data
- continue: 继续
- break: 中断循环
- compute_time: 时间计算。字段 computeType,time1,time2,formatString,outputVar
- string_process: 字符串处理。字段 data,method,value,start,length,outputVar
- str_compare: 字符串比较。字段 param1,param1Var,compareType,param2,param2Var,case,outputVar。compareType 可取 match/contains/=
- gen_temp_file_path: 生成临时文件路径。字段 ext,outputVar
- quicker_operations: Quicker 操作。字段 operation,searchText,skinId,theme,viewMode
- get_window_title: 获取窗口信息。字段 which,windowName,className,procIdOrName,hWnd,outputVar
- form: 表单。字段 operation,title,formDef,help,windowWidth,titleColumnWidth,outputVar
- ui_automation: UI 自动化。字段 operation,window,windowVar,control,controlVar,controlType,controlOperation,value,valueVar,outputVar,isSuccessVar
- mouse_click: 鼠标移动或点击。字段 x,y,action,delayMs。action 可取 left/right/double/middle/none；如果只想移动不点击，用 none
- key_input: 模拟按键。字段 keys,ctrlKeys,delayMs。keys/ctrlKeys 使用 Windows 虚拟键码，例如 Enter=13, A=65, C=67, S=83, Ctrl=162。
- delay: 延迟。字段 delayMs
- each: 遍历列表。字段 inputVar,itemVar,countVar,steps
- repeat: 重复执行。字段 count,delayMs,steps
- list_append: 列表追加。字段 listVar,item,itemVar
- list_remove_all_by_value: 删除列表中的指定值。字段 listVar,item,itemVar
- list_operation: 列表操作。字段 listVar,operation,item,itemVar,pattern,list2,pos,length
- split_string: 分割字符串。字段 inputVar,separator,outputVar,removeEmpty
- join_list: 拼接列表。字段 listVar,separator,outputVar
- replace_text: 文本替换。字段 inputVar,oldValue,newValue,outputVar,useRegex
- regex_extract: 正则提取。字段 inputVar,pattern,outputVar
- enum_files: 枚举目录文件。字段 path,outputVar,searchPattern,recursive
- enum_dirs: 枚举子目录。字段 path,outputVar,searchPattern,recursive
- create_folder: 创建文件夹。字段 path,pathVar
- copy_files: 复制文件到目录。字段 path,pathVar,dstPath
- move_files: 移动文件到目录。字段 path,pathVar,dstPath
- recycle_path: 移动到回收站。字段 path,pathVar,noUi
- delete_path: 直接删除文件。字段 path,pathVar
- rename_path: 重命名或移动到完整新路径。字段 path,pathVar,dstPath
- create_file: 创建空文件。字段 path,pathVar
- read_text_file: 读取文本文件。字段 path,pathVar,outputVar
- write_text_file: 写入文本文件。字段 path,content,pathVar,contentVar,append
- assign: 赋值表达式。字段 expression,outputVar
- notify: 通知。字段 message,notifyType
- stop: 停止动作。字段 message,isError
- group: 分组。字段 steps,note
- format_string: 格式化字符串。字段 formatString,params,outputVar
- get_current_time: 获取当前时间。字段 format,outputVar
- json_extract: JSON提取。字段 inputVar,paths,outputVars
- show_text: 显示文本窗口。字段 text,textVar,title
- output_text: 输出文本/粘贴文本。字段 text,textVar
- subprogram: 子程序调用。字段 name,outputs
- run_action: 运行动作。字段 actionId,inputParam,outputVar
- download: 下载。字段 url,savePath,saveName,ua,header,cookie,expireSeconds,showProgress,autoRename
- window_operation: 窗口操作。字段 operation,hWnd
- audio_control: 音频控制。字段 operation,deviceId,volume,mute
- key_state: 读取按键状态。字段 key,outputVar
- get_active_process_info: 获取当前进程信息。字段 outputVar
- get_folder_path: 获取系统目录。字段 folder,outputVar
- todo: 注释/TODO。字段 message

禁止使用 runScript 兜底。禁止发明未列出的 type。
如果需求需要未知能力，使用 todo 说明缺少哪个真实样本或官方映射。
如果缺关键参数，用 TODO_填写_xxx 占位。
强制规则：
- 只要用户说“用户选择、选择、选项、按选项、如果选 a/选 b”，必须优先生成 select，不要用 user_input 代替。
- select 后的不同选择必须写在 branches 里；不要输出“缺少 if/branch”的 TODO。
- branches 里的 steps 继续使用已知 type，例如 open_url、comment、write_clipboard。
- “不执行、什么都不做、无操作”用 comment 步骤表达即可。
- “停止/结束动作/取消后停止”用 stop，不要只写 comment。
- “确认/是否继续/危险操作前询问”用 confirm + if，不要用 user_input。
- “当前选中文件/选择的文件”用 get_selected_files，不要让用户手填路径。
- “当前资源管理器目录/当前目录”用 get_explorer_path。
- “获取文件名/扩展名/所在目录”用 path_info。
- “逐个处理/遍历/对每个文件”用 each。
- “重复 N 次/循环 N 次”用 repeat。
- “按 Ctrl+C/Ctrl+S/回车/删除键”用 key_input。
- “读取文件内容/写入文件内容”用 read_text_file / write_text_file。
- “替换/去掉/分割/拼接/正则提取文本”优先使用 replace_text / split_string / join_list / regex_extract。
- “格式化字符串、拼接模板”优先使用 format_string。
- “取当前时间并格式化”用 get_current_time。
- “JSON路径提取”用 json_extract。
- “显示调试文本”用 show_text。
- “输出为剪贴板粘贴/输出文本”用 output_text。
- “调用子程序/调用其他动作”用 subprogram / run_action。
- “下载文件”用 download。
- “关闭窗口/置顶/切换窗口”用 window_operation。
- “获取音量/静音/设备”用 audio_control。
- “查询按键状态”用 key_state。
- “获取活动进程/桌面路径”用 get_active_process_info / get_folder_path。
输出格式：
{
  "mode": "blocks",
  "title": "动作标题",
  "description": "简短描述",
  "steps": []
}
模式判断：
- mode 为 blocks：需求可以完全由上面的已知积木表达。
- mode 为 csharp：需求需要 WMI、注册表、系统 API、复杂自定义 UI、Quicker 内部 API，或无法由已知积木准确表达。
只要选择 csharp，steps 可以为空；不要为了绕过未知能力而虚构积木 type。
只输出 JSON，不要 Markdown。

正确示例：
用户需求：让用户选择，选项 a 打开百度，选项 b 打开飞书，选项 c 不执行
输出：
{
  "mode": "blocks",
  "title": "按选项打开网页",
  "description": "根据用户选择打开不同网页",
  "steps": [
    {
      "type": "select",
      "mode": "single",
      "prompt": "请选择",
      "outputVar": "choice",
      "items": [
        {"label": "a", "value": "a"},
        {"label": "b", "value": "b"},
        {"label": "c", "value": "c"}
      ],
      "branches": [
        {"when": "a", "steps": [{"type": "open_url", "url": "https://www.baidu.com"}]},
        {"when": "b", "steps": [{"type": "open_url", "url": "https://www.feishu.cn"}]},
        {"when": "c", "steps": [{"type": "comment", "message": "用户选择 c，不执行任何操作"}]}
      ]
    }
  ]
}`;

export function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("模型没有返回 JSON");
  }
  return match[0];
}

function containsStepType(steps, type) {
  return Array.isArray(steps) && steps.some((step) => {
    if (step?.type === type) {
      return true;
    }
    return containsStepType(step?.steps, type)
      || containsStepType(step?.ifSteps, type)
      || containsStepType(step?.elseSteps, type)
      || (Array.isArray(step?.branches) && step.branches.some((branch) => containsStepType(branch.steps, type)));
  });
}

const TYPE_ALIASES = new Map([
  ["info", "notify"],
  ["message", "notify"],
  ["success", "notify"],
  ["notification", "notify"],
  ["clipboard_write", "write_clipboard"],
  ["read_clipboard", "get_clipboard_text"],
  ["selected_files", "get_selected_files"],
  ["open_website", "open_url"],
  ["open_webpage", "open_url"]
]);

function normalizeStep(step) {
  if (!step || typeof step !== "object") {
    return step;
  }

  const normalized = { ...step };
  if (TYPE_ALIASES.has(normalized.type)) {
    normalized.type = TYPE_ALIASES.get(normalized.type);
  }

  if (
    normalized.type === "comment" &&
    /停止|结束|取消/.test(String(normalized.message || ""))
  ) {
    normalized.type = "stop";
  }

  if (Array.isArray(normalized.steps)) {
    normalized.steps = normalized.steps.map(normalizeStep);
  }
  if (Array.isArray(normalized.ifSteps)) {
    normalized.ifSteps = normalized.ifSteps.map(normalizeStep);
  }
  if (Array.isArray(normalized.elseSteps)) {
    normalized.elseSteps = normalized.elseSteps.map(normalizeStep);
  }
  if (Array.isArray(normalized.branches)) {
    normalized.branches = normalized.branches.map((branch) => ({
      ...branch,
      steps: Array.isArray(branch.steps) ? branch.steps.map(normalizeStep) : []
    }));
  }

  return normalized;
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== "object") {
    return {
      mode: "blocks",
      title: "AI生成动作",
      description: "",
      steps: []
    };
  }
  return {
    ...plan,
    mode: plan.mode === "csharp" ? "csharp" : "blocks",
    steps: Array.isArray(plan.steps) ? plan.steps.map(normalizeStep) : []
  };
}

function findFirstStep(steps, type) {
  if (!Array.isArray(steps)) {
    return null;
  }
  for (const step of steps) {
    if (step?.type === type) {
      return step;
    }
    const nested = findFirstStep(step?.steps, type)
      || findFirstStep(step?.ifSteps, type)
      || findFirstStep(step?.elseSteps, type);
    if (nested) {
      return nested;
    }
    if (Array.isArray(step?.branches)) {
      for (const branch of step.branches) {
        const inBranch = findFirstStep(branch.steps, type);
        if (inBranch) {
          return inBranch;
        }
      }
    }
  }
  return null;
}

function repairPlan(prompt, plan) {
  plan = normalizePlan(plan);
  const text = String(prompt || "");
  const needsSelection = /用户选择|按选项|选项|选择|如果选|若选/.test(text);
  if (needsSelection && !containsStepType(plan?.steps, "select")) {
    const inferredSelect = inferSelectPlan(text);
    if (inferredSelect) {
      return {
        mode: "blocks",
        title: plan?.title || "按选项执行",
        description: plan?.description || "根据用户选择执行不同步骤",
        steps: [
          inferredSelect,
          {
            type: "comment",
            message: "模型未正确使用用户选择积木，已由生成器自动修正为 sys:select + sys:simpleIf"
          }
        ]
      };
    }
  }

  const needsMouse = /鼠标|移到|移动到|左键|右键|双击|中键|点击|等待|循环|重复/.test(text);
  if (needsMouse && (containsStepType(plan?.steps, "mouse_click") || containsStepType(plan?.steps, "mouse"))) {
    const inferredMouse = inferMousePlan(text);
    if (inferredMouse) {
      return {
        mode: "blocks",
        title: plan?.title || inferredMouse.title || "鼠标操作",
        description: plan?.description || inferredMouse.description || "鼠标操作",
        steps: inferredMouse.steps
      };
    }
  }

  const needsEach = /每个|逐个|遍历|依次/.test(text);
  if (needsEach && !containsStepType(plan?.steps, "each")) {
    const enumStep = findFirstStep(plan?.steps, "enum_files") || findFirstStep(plan?.steps, "enum_dirs");
    if (enumStep?.outputVar) {
      plan.steps.push({
        type: "each",
        inputVar: enumStep.outputVar,
        itemVar: "item",
        countVar: "count",
        steps: [
          {
            type: "list_append",
            listVar: "resultList",
            itemVar: "item"
          }
        ]
      });
      plan.steps.push({
        type: "comment",
        message: "模型未正确使用遍历积木，已由生成器自动补充 sys:each + sys:listOperations"
      });
    }
  }

  return plan;
}

export async function requestModel(config, messages, temperature = 0.1) {
  if (!config.apiKey || config.apiKey.includes("REDACTED")) {
    throw new Error("未配置 API Key，无法调用模型");
  }

  const url = `${String(config.apiBaseUrl).replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      messages
    })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`模型调用失败：HTTP ${response.status} ${body}`);
  }

  const payload = JSON.parse(body);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`模型响应缺少 content：${body}`);
  }

  return content;
}

export async function planWithModel(config, prompt) {
  if (!config.apiKey || config.apiKey.includes("REDACTED")) {
    return { ...fallbackPlan(prompt, "未配置 API Key，使用本地规则解析"), mode: "blocks" };
  }

  const content = await requestModel(config, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt }
  ]);

  return repairPlan(prompt, JSON.parse(extractJson(content)));
}
