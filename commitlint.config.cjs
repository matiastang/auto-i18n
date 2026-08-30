/*
 * @FilePath: /auto-i18n/commitlint.config.cjs
 * @Description: commitlint 配置——约定式提交默认规则
 *
 * 现有历史风格（如 "feat: - 接入SpecKit规格驱动开发..."）与该规则集兼容：
 * subject 前导 "- " 与中文描述不触发任何默认规则。
 */
/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
    extends: ['@commitlint/config-conventional'],
}
