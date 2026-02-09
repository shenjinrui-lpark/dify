import { danger, warn, message, fail, schedule } from 'danger'
import { runAllRules } from './.danger'

schedule(async () => {
  await runAllRules({
    danger,
    warn,
    message,
    fail,
  })
})
