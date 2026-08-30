<!--
 * @Author: matiastang
 * @Date: 2024-08-23 16:31:00
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 16:39:12
 * @FilePath: /auto-i18n/PROJECT.md
 * @Description: 开发文档
-->
# 开发文档

## 注意事项

### 使用的`Vue`版本

* 使用`"vue": "3.3.4"`如果使用`"vue": "3.4.38"`则`tsc --build src/autoi18n/tsconfig.json`会报如下错误：

```sh
> tsc --build src/autoi18n/tsconfig.json

node_modules/.pnpm/@vue+runtime-dom@3.4.38/node_modules/@vue/runtime-dom/dist/runtime-dom.d.ts:449:26 - error TS2304: Cannot find name 'ToggleEvent'.

449     onToggle?: (payload: ToggleEvent) => void;
```

* [vue修改一个issues时添加了`(payload: ToggleEvent) => void`](https://github.com/vuejs/core/pull/10938)
* `https://github.com/vuejs/core/blob/main/packages/runtime-dom/src/jsx.ts`的`409`行
```ts
export interface DetailsHTMLAttributes extends HTMLAttributes {
  open?: Booleanish
  onToggle?: (payload: ToggleEvent) => void
}
```
还不知道原因，只知道`3.3.4`版本没有问题，`3.4.38`版本有问题。

## SpecKit 规格驱动开发

项目已接入 [GitHub Spec Kit](https://github.com/github/spec-kit)（v1.0.1），集成方式为 `zcode`，用于后续新功能的规格驱动开发（Spec-Driven Development）。

### 环境管理（uv）

Python 环境统一使用 [uv](https://docs.astral.sh/uv/) 管理：

```sh
# 持久安装 Specify CLI（已安装，升级用）
uv tool install specify-cli
uv tool upgrade specify-cli

# 一次性运行（不污染环境）
uvx --from specify-cli specify --help

# 运行 .specify/scripts/ 下的辅助脚本（纯标准库，无需额外依赖）
uv run --no-project python .specify/scripts/python/check_prerequisites.py --json
```

### 开发工作流

在 ZCode 中按顺序使用以下 skill（`$` 或 `/` 触发）：

| 阶段 | 命令 | 说明 |
| --- | --- | --- |
| 1. 立项 | `$speckit-constitution` | 建立项目原则与约束（`.specify/memory/constitution.md`，建议先自定义） |
| 2. 规格 | `$speckit-specify <功能描述>` | 根据自然语言描述生成 `specs/NNN-<功能名>/spec.md` |
| 3. 计划 | `$speckit-plan` | 生成技术实现方案 `plan.md` |
| 4. 任务 | `$speckit-tasks` | 拆解为可执行任务清单 `tasks.md` |
| 5. 实现 | `$speckit-implement` | 按任务清单逐项实现 |

可选增强：`$speckit-clarify`（计划前澄清歧义）、`$speckit-checklist`（计划后质量清单）、`$speckit-analyze`（实现前一致性检查）、`$speckit-converge`（存量代码收敛为任务）。

### 目录结构

* `.specify/` — SpecKit 基础设施：模板（`templates/`）、脚本（`scripts/python/`，Windows 下推荐 `py` 脚本）、工作流（`workflows/`）、项目原则（`memory/constitution.md`）
* `specs/` — 各功能的规格产物（`spec.md` / `plan.md` / `tasks.md`），首次执行 `$speckit-specify` 时创建
* `.zcode/skills/` — ZCode 用的 speckit skills（随仓库提交，供团队共享）
