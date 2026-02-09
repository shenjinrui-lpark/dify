import { RuleContext } from '../types'
import load from '@commitlint/load'
import lint from '@commitlint/lint'

interface CompareResult {
  status: 'ahead' | 'behind' | 'diverged' | 'identical'
  ahead_by: number
  behind_by: number
}

export const baselineCheck = async ({ danger, warn, fail, message }: RuleContext): Promise<void> => {
  const body = danger.github.pr.body

  // PR 描述校验
  if (!body || body.length < 30) {
    fail('❌ PR 描述过短，请补充背景 / 影响 / 验证方式')
  }

  // 强制需求号（Jira / TAPD）
  const prTitle = danger.github.pr.title
  if (!/(JIRA|TAPD|Sentry)-\w+/i.test(prTitle)) {
    warn('PR 标题建议包含需求号，如 JIRA-1234')
  }

  // 强制环境
  if (!/(测试|预发布)/.test(prTitle)) {
  //  warn('❌PR 标题需要包含环境，如 测试或预发布')
    fail('❌PR 标题需要包含环境，如 测试或预发布')
  }

  // 修改文件数量提醒
  const changedFiles = danger.github.pr.changed_files
  if (changedFiles > 50) {
    warn(`本次 PR 修改文件数较多（${changedFiles}），建议拆分`)
  }

  // 修改行数量提醒
  const changedLines = await danger.git.linesOfCode()
  if (changedLines && changedLines > 2000) {
    warn(`本次 PR 修改行数较多（${changedLines}），建议拆分`)
  }

  // 分支落后提醒
  const api = danger.github.api
  const owner = danger.github.thisPR.owner
  const repo = danger.github.thisPR.repo
  const headBranch = danger.github.pr.head.ref
  const baseBranch = danger.github.pr.base.ref

  try {
    // 比较 base...head
    const response = await api.repos.compareCommits({
      owner,
      repo,
      base: baseBranch,
      head: headBranch,
    })

    const { status, ahead_by, behind_by } = response.data as CompareResult

    // 输出状态信息
    message(`📊 分支状态: 领先 ${ahead_by} 个提交，落后 ${behind_by} 个提交`)

    switch (status) {
      case 'behind':
        warn(` 当前分支落后 ${baseBranch} ${behind_by} 个提交，请先 rebase/merge`)
        break

      case 'diverged':
        warn(` 当前分支与 ${baseBranch} 产生分叉（领先 ${ahead_by}，落后 ${behind_by}），建议 rebase`)
        break

      case 'ahead':
        message(`✅ 当前分支领先 ${baseBranch} ${ahead_by} 个提交`)
        break

      case 'identical':
        message(`✅ 当前分支与 ${baseBranch} 完全一致`)
        break
    }

    // 落后太多时强制失败
    if (behind_by > 20) {
      warn(`🚨 分支落后超过 20 个提交，强烈建议更新分支`)
    }
  } catch (error) {
    console.error('获取分支比较信息失败:', error)
  }

  // commit message 格式校验
  // @ts-ignore 类型里面没有labels, 实际返回有
  const labels = danger.github.pr.labels.map((l: any) => l.name)
  if (labels.includes('danger:skip-commit-check')) {
    message('已跳过 commit message 校验（人工确认）')
  } else {
    const config = await load({}, { cwd: process.cwd() })
    for (const commit of danger.git.commits) {
      // 约定式提交
      const ruleOutcome = await lint(commit.message, config.rules, {
        plugins: config.plugins,
        ignores: config.ignores,
      })
      if (!ruleOutcome.valid) {
        const tapdOrJiraError = ruleOutcome.errors.find((item) => item.name === 'tapd-or-jira')
        if (tapdOrJiraError) {
          warn(`❌Commit message: ${commit.message}: ${tapdOrJiraError.message}`)
        }
        const otherErrors = ruleOutcome.errors.filter((item) => item.name !== 'tapd-or-jira')
        if (otherErrors.length > 0) {
          warn(`❌ Commit message: ${commit.message}: 不符合约定式提交规范, 请参考: https://www.conventionalcommits.org/zh-hans/v1.0.0/`)
        }
      }
    }
  }
}
