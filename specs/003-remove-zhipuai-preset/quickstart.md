# Quickstart: v0.0.4 验证指南

**Date**: 2026-08-29 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

## 前置条件

- Node ≥ 18、pnpm 10.17.1；已执行 `pnpm install`
- 自动化验证**无需任何 API Key、无需外网**

## 1. 离线自动化验证（对应 SC-002/SC-003/SC-004）

```bash
pnpm type-check     # 类型检查（智谱旧引用应已全部消失，否则此处报错即迁移点）
pnpm test           # 单元 + 集成 + Use Case（全离线：fetch 均 stub）
pnpm test:e2e       # 演示应用 e2e（demo 文案已缓存，不触发网络翻译）
```

预期：全部通过。关键用例变化：
- `tests/unit/index-exports.spec.ts`——导出清单**不含** `zhipuaiTranslate`；`TranslateAIModel` 仅 `OPENAI` 成员
- `tests/unit/translates-provider.spec.ts`——旧值 `'zhipuai'` → 一次性警告 + 回退免费源（新增用例）
- `tests/unit/translates-zhipuai.spec.ts`——**已删除**
- 其余既有用例（openai/free/shared/usecase/integration/e2e）零回退

## 2. 智谱迁移等价性验证（对应 SC-001，stub 离线）

`tests/unit/translates-provider.spec.ts` 的智谱参数用例直接固化等价性（research.md R3）：

```ts
// 参数取值替换即可，无需专门智谱用例（research.md R3）
aiModelConfig: {
    model: TranslateAIModel.OPENAI,
    config: {
        apiKey: 'zhipu-key',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4',
    },
}
```

预期请求与 v0.0.3 ZHIPUAI 模式逐字段一致：`POST https://open.bigmodel.cn/api/paas/v4/chat/completions`、`Authorization: Bearer zhipu-key`、体 `{model: 'glm-4', messages: [...]}`。

## 3. 真实智谱 Key 验证（可选，一次性人工，不进 CI）

```bash
# .env.local
OPENAI_API_KEY=<智谱 apiKey>
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
pnpm dev
```

预期：翻译请求走智谱端点，译文写入 `public/translate.json`；存量缓存条目全部命中不重译。**自动化测试不执行此步**（请求构造已由 stub 用例离线覆盖；智谱为收费接口，遵守"不调用收费 API"纪律）。

## 4. 库构建验证

```bash
pnpm plugin:build   # 产出 dist/，确认删除模块后构建无残留引用错误
```

## 5. 文档核对（对应 SC-005）

- 双语 README：翻译源清单无智谱条目、配置示例无 `ZHIPUAI_API_KEY` 分支、含智谱迁移示例
- CHANGELOG：v0.0.4 条目标注破坏性变更与迁移路径
- CLAUDE.md：架构段无 `zhipuai.ts` 表述；`package.json` 与 `AUTOI18N_PLUGIN_VERSION` 均为 0.0.4
