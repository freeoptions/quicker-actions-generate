# AGENTS.md

## 项目概述

这是一个用 Node.js 生成 Quicker 动作 JSON 的本地工具。输入自然语言后，模型先生成结构化计划，项目再把计划转换为已有样本验证过的 Quicker 积木，最后把可导入的 JSON 写入配置的输出目录。

- 运行环境：Node.js 20+，ES Modules。
- 主要语言：JavaScript。
- 默认输出目录由 `config.local.json` / `config.example.json` 的 `outputDir` 决定。
- `samples/` 是 Quicker 动作样本库，目录较大，检索时优先使用 `rg`，不要全量读取。
- 当前项目没有 Maven、前端、TypeScript 或独立的 lint 配置。

## 关键文件

- `src/generate.js`：命令行入口，生成动作、写入 JSON、复制输出路径到剪贴板。
- `src/model.js`：调用模型，将自然语言转换为动作计划。
- `src/fallbackPlanner.js`：模型不可用时的有限兜底计划。
- `src/builder.js`：把计划映射成 Quicker 动作和积木，并收集变量。
- `src/steps.js`：已确认可用的 Quicker 积木构造函数。
- `src/quicker.js`：Quicker 动作外壳、基础积木和参数结构。
- `src/config.js`：合并示例配置、本地配置和环境变量。
- `src/samples.js`：读取和分析样本。
- `scripts/smoke-test.js`：现有的基础构造验证。
- `scripts/analyze-samples.js`：分析样本库。
- `scripts/build-dissolve-action.js`：生成“全部解散（重名自动改名）”独立动作。
- `scripts/build-clash-mode-action.js`：生成“Clash 模式手动选择”动作。
- `work/`：分析结果或临时工作文件，不应当作正式源码。

## Quicker JSON 注意事项

1. 普通组合动作的外层 `Data` 是一个 JSON 字符串。检查动作时需要先解析外层 JSON，再解析 `Data`。
2. `UseTemplate: true` 且 `Data`、`Children` 为 `null` 的动作只是云端模板引用，不包含实际步骤，不能直接修改其执行逻辑。
3. 只使用 `src/steps.js` 或真实样本中已经确认的 `StepRunnerKey` 和参数结构；不要凭空编造 Quicker 积木。
4. 新的普通组合动作应通过 `buildAction()` / `makeActionShell()` 构造，保持变量声明和动作外壳一致。
5. Quicker 格式化字符串通常以 `$$` 开头，例如 `$$"{变量}"`；C# 表达式通常以 `$=` 开头。修改前应从现有代码或样本确认具体用法。
6. 动作 JSON 和源码中的中文直接使用 UTF-8 中文，不得改成 `\uXXXX`。
7. 处理文件冲突时不得静默覆盖；应明确生成无冲突目标或报错。
8. `sys:simpleIf` 只执行 `IfSteps`；真实 Debug 日志确认其 `ElseSteps` 会被忽略。需要 else 逻辑时，先赋值一个反向布尔变量，再增加第二个 `sys:simpleIf`。
9. 需要“动作运行期间常驻、动作停止后消失”的提示时，优先使用 `sys:showWaitWin`。常用参数为 `mode: show`、`autoCloseSeconds: 0`、`activateMode: NotActivatable`，右上角位置使用 `winLocation: TopRight`。`sys:notify` 会自动隐藏，不适合常驻状态提示。
10. `sys:showWaitWin` 的 `stopActionIfClose` 只负责用户点击窗口右上角 `X` 时停止动作；点击默认按钮或附加操作按钮只会关闭等待窗口。若按钮也要停止动作，应在循环中使用 `mode: check` 输出 `isClosed`，判断为 `true` 后执行 `sys:stop`，并把检查放在模拟按键之前，避免关闭后再多发送一次按键。
11. 等待窗口的默认按钮字段 `btnText` 只按普通文本显示，不解析 `[fa:...]` 图标标记。需要带图标的按钮时，将 `btnText` 设为空以隐藏默认按钮，把按钮写到 `operations`（附加操作按钮）中，例如 `[fa:Solid_StopCircle:#E07856]停止自动收集|stop`；`operations` 才会通过操作项解析器处理图标。
12. 如果 `[fa:Solid_StopCircle:...]` 被原样显示成 `[fa:SolidStopCircle:...]`，不是图标名里没有下划线，而是图标标记放进了不支持解析的普通按钮字段，WPF 又把 `_` 当成快捷键标记隐藏了。不要通过删除下划线或盲目更换图标名解决，应先确认字段是否支持操作项解析。
13. 图标名称必须从当前 Quicker 自带的 Font Awesome 图标库或真实可用样本中确认，不要只凭名称猜测。已确认当前版本存在 `Solid_StopCircle`；但 JSON 结构正确、图标枚举存在，都不能替代 Quicker 中的实际渲染验证。
14. `sys:reportProgress` 创建的独立进度条如果没有显式执行 `REMOVE`，动作异常或中止后可能残留。对于“动作停止即消失”的状态提示，不要用独立进度条替代等待窗口，除非已经验证所有停止路径都会清理。
15. `sys:select` 单选的默认 `OutputParams.textValue` 是文本输出，对应变量必须声明为 `Type: 0`；多选输出才是列表 `Type: 4`。把单选字符串值声明为 `Type: 1（Number）` 会在用户选择 `rule` 等值时直接报“目标类型 Number、源对象 System.String”。
16. `sys:select` 的显示标题和值是两套数据，项目使用 `标题|值` 组织选项，例如 `规则模式|rule`。默认 `textValue` 输出右侧的值；需要输出左侧标题时使用 `OutputParams.selectedItemTitle`。两种单选输出都应声明为文本 `Type: 0`。
17. 单选值可以使用 `rule`、`global`、`direct` 等字符串，不必为了规避变量类型错误强行改成数字。生成选择动作后必须同时检查 `InputParams.items`、`OutputParams` 和 `Variables`，不能只检查窗口能否显示。

## 批量文件操作经验

1. `sys:fileOperation` 的 `moveInto` 适合单个源路径，不要把文件列表变量直接交给它。真实运行中，大列表被传给 `moveInto` 后出现大量“源路径不存在”，并可能在部分预处理完成后停止。
2. 真实样本确认 `moveIntoWithShell` 可以接收文件列表变量。需要批量移动时，应先收集完整文件列表，再调用一次 `moveIntoWithShell`；不要在逐文件循环里调用它。逐张调用 Shell 处理约 12000 张图片时，资源管理器和输入法状态标识会频繁刷新。
3. 重名处理应在批量移动前完成：循环只负责检测冲突、必要时原地改名并收集最终路径，最后统一移动。批内尚未移动的文件也要维护“已占用目标路径”集合，并按 Windows 文件名大小写不敏感规则比较，避免同一批的两个同名文件都误判为可用。
4. 当前“全部解散”动作的重命名编号范围是 `0-5000`。随机数只是起点；冲突后应按模 5001 继续检查其他编号，最多检查 5001 个候选。不得覆盖，全部占用时停止并报错。
5. 删除或回收源目录前，必须重新确认源目录中已经没有文件；仍有文件时保留目录并停止。成功通知只能放在实际移动和清理完成之后。

## Clash Verge Rev 动作经验

1. 截至 2026-08-20，本机 Clash Verge Rev 2.5.2 和官方 `dev` 源码的完整模式切换流程是内部 Tauri 命令 `patch_clash_mode` 调用 `feat::change_clash_mode`。该流程不仅 PATCH Mihomo，还会更新并保存 Clash Verge Rev 的内存配置、发出界面刷新事件、更新托盘菜单和图标，并按设置关闭已有连接。以后版本可能变化，修改前重新查官方源码。
2. 直接调用 Mihomo `PATCH /configs` 只改变内核运行态，不能等同于“Clash Verge Rev 软件已完成切换”。界面和托盘可能仍显示旧模式，软件也可能随后用自己的配置覆盖运行态。不得仅凭 HTTP 2xx 就通知“软件已切换成功”。
3. Clash Verge Rev 没有用于模式切换的公开 URL Scheme；现有深链只用于导入订阅。外部自动化若要走软件自身的完整切换流程，优先使用它提供的全局快捷键。
4. 当前本机约定的快捷键为：规则模式 `Ctrl+Alt+Shift+1`、全局模式 `Ctrl+Alt+Shift+2`、直连模式 `Ctrl+Alt+Shift+3`。`scripts/build-clash-mode-action.js` 依赖这组本机配置；换电脑或改快捷键后必须同步修改动作。
5. Quicker 模拟上述组合键的已确认结构是 `CtrlKeys: [162, 164, 160]`，数字键 `1/2/3` 分别是 `Keys: [49]`、`[50]`、`[51]`。这些参数来自项目真实样本。
6. 设置为指定模式的快捷键是幂等操作：当前已经是规则模式时再次发送“规则模式”快捷键不会切到其他模式。因此简单动作无需先查询当前模式；让用户选择模式后直接发送对应快捷键即可。
7. 当前“Clash 模式手动选择 V8”只有一个 `sys:select`、三条条件分支、三条快捷键和三条通知，不包含 HTTP 请求或 API 密钥。通知紧跟快捷键，是按当前需求提供的操作提示，不代表程序已独立校验界面状态。
8. “启用外部控制器”开关未保存时，`config.yaml` 也可能已经存在 `external-controller: 127.0.0.1:9097`；字段存在不代表端口正在监听。需要判断时同时检查 `verge.yaml` 的 `enable_external_controller`、实际监听端口和只读 `GET /configs`。
9. API 密钥不得写进可分享的动作、回复或日志。Quicker Debug 日志可能包含请求头和运行时变量，分享前必须检查并脱敏。当前动作不需要外部控制器，优先关闭不再需要的外部控制并更换已经暴露的密钥。
10. 未经用户明确允许，不得为了验证动作而实际发送 Clash 模式快捷键、切换代理模式、重启 Clash Verge Rev 或修改其设置。用户只允许静态检查时，仅检查 JSON 结构、变量类型、按键编码和现有 smoke 测试。

## 配置和敏感信息

- `config.local.json` 是本机配置，可能包含 API Key 或本地路径。除非需求明确要求，否则不要修改、打印或提交其中的敏感值。
- 示例配置写在 `config.example.json`，新增通用配置项时同步考虑示例配置。
- 不要假设其他机器存在当前配置中的盘符或 Quicker 安装路径。

## 常用命令

```powershell
# 运行基础 smoke 测试
npm run smoke

# 根据命令行提示词生成动作
npm run generate -- "打开百度"

# 生成一次性“AI动作生成器”Quicker 动作
npm run make-action

# 启动本地 HTTP 服务
npm start

# 只检查某个脚本的 JavaScript 语法
node --check scripts\build-dissolve-action.js
```

## 修改流程

1. 先看相关模块骨架，再定位具体函数；查字符串、积木或样本时使用 `rg`。
2. 保持最小改动，不格式化整个文件，不调整无关空白或换行。
3. 新能力优先复用 `src/steps.js`；只有确有真实依据时才补充积木构造函数。
   - 在 Windows PowerShell 5.1 中读取无 BOM 的 UTF-8 文件时显式使用 `Get-Content -Encoding UTF8`；控制台显示乱码不等于文件已经损坏，修改前先按 UTF-8 重新读取确认。
4. 生成或修改动作后，至少验证：
   - 外层 JSON 可以解析；
   - `Data` 内层 JSON 可以解析；
   - `UseTemplate`、`Steps`、变量和参数符合预期；
   - 中文没有 `\uXXXX` 转义；
   - `npm run smoke` 通过。
5. 文件移动、删除类动作必须在隔离副本上实测，先确认测试路径，再执行删除；不要改动用户提供的原始测试目录。
6. 测试结束后清理自己创建的临时目录和测试产物。
7. 没有实际运行验证时，不要声称“完成”“通过”或“可导入”。

## Git 和产物

- 开始任务时先确认当前目录是否为 Git 仓库；若不是，不要假装能查看 commit 或 `git diff`，改用文件对比和哈希自检。
- 除非用户明确要求，否则不要执行 push。
- 不提交或保留 `node_modules/`、生成的动作 JSON、临时测试目录以及其他构建产物。
- 工作区存在用户未提交改动时，不覆盖、不回退；发生冲突先停下说明。
