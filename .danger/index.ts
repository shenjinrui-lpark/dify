import { RuleContext, RuleFunction } from './types'

// 同步规则
import { baselineCheck } from './rules/baseline'

// 异步规则

// 同步规则列表
export const syncRules: RuleFunction[] = []

// 异步规则列表
export const asyncRules: RuleFunction[] = [baselineCheck]

// 执行所有规则
export const runAllRules = async (ctx: RuleContext): Promise<void> => {
  // 执行同步规则
  syncRules.forEach((rule) => rule(ctx))

  // 执行异步规则
  await Promise.all(asyncRules.map((rule) => rule(ctx)))

  // 正向激励
  ctx.message('✅ 感谢你的贡献，Danger 已完成基础检查')
}
