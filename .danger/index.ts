// 只保留类型 import（TS 会自动擦除）
import type { RuleContext, RuleFunction } from './types'

// 用 require 引入规则
//const baselineCheck = require('./rules/baseline')
const baselineCheck = require('./rules/baseline').baselineCheck


// 同步规则
const syncRules: RuleFunction[] = []

// 异步规则
const asyncRules: RuleFunction[] = [baselineCheck]

// 执行所有规则
export const runAllRules = async (ctx: RuleContext): Promise<void> => {
  syncRules.forEach((rule) => rule(ctx))
  await Promise.all(asyncRules.map((rule) => rule(ctx)))
  ctx.message('✅ 感谢你的贡献，Danger 已完成基础检查')
}
