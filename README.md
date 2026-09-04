# Quicker Actions Generate

输入自然语言，自动生成 Quicker 积木动作或 C# Roslyn v2 动作，保存到配置目录，并把 JSON 文件路径写入剪贴板。

## 使用

1. 安装 Node.js 20+。
2. 复制 `config.example.json` 为 `config.local.json`，填写 `apiKey`、`outputDir`；确认 `quickerSkillDir` 指向已安装的 `quicker-skill`。
3. 运行下面的命令生成一次性导入动作：

```powershell
npm run make-action
```

把生成的 `AI动作生成器.json` 通过 Quicker 的“导入动作”完成一次性安装。以后直接运行这个动作，输入自然语言即可生成动作；生成后的 JSON 文件路径会自动复制到剪贴板。

生成模式由 `generationMode` 控制：`auto` 根据需求自动选择，`blocks` 强制使用积木，`csharp` 强制生成 C# Roslyn v2 动作。命令行也可以用 `--mode blocks` 或 `--mode csharp` 临时覆盖配置，HTTP 请求可以传 `{"mode":"csharp"}`。C# 动作会同时生成 `.json`、`.cs` 和 `_简介.md`，并调用 `quicker-skill/scripts/build.ps1` 通过 QK 扳手构建；积木动作仍需把 JSON 导入 Quicker。

这个动作会直接调用本地 `node src/generate.js`，不需要手动启动服务，也不需要在 Quicker 里配置 HTTP 请求。

注意：Quicker 空白处的“粘贴动作”只识别 Quicker 的 `Sharedaction` 链接，不能直接识别本地 JSON 文本；本地生成文件目前仍需使用“导入动作”。

## HTTP 接口

HTTP 服务仍可用于调试或其他程序调用。启动：

```powershell
node src/server.js
```

测试生成：

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:17321/generate -ContentType 'application/json; charset=utf-8' -Body '{"prompt":"打开百度，然后写入剪贴板 hello"}'
```

返回里的 `path` 就是生成的 Quicker JSON 文件，服务也会把这个文件路径写入剪贴板。

## 旧的 HTTP 调用方式（可选）

在 Quicker 动作里用 HTTP 请求积木调用：

- URL: `http://127.0.0.1:17321/generate`
- Method: `POST`
- Body:

```json
{"prompt":"{你的输入变量}"}
```

积木后端只使用样本库已确认的积木。未知能力在 `auto` 模式下会转交 C# 后端，不会编造未知 `StepRunnerKey`。
