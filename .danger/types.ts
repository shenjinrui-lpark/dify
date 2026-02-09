import { DangerDSLType } from 'danger'

export interface RuleContext {
  danger: DangerDSLType
  warn: (msg: string) => void
  message: (msg: string) => void
  fail: (msg: string) => void
}

export type RuleFunction = (ctx: RuleContext) => void | Promise<void>
