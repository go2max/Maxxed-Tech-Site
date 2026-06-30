import { commerceSeedTask } from '../admin/src/commerce-seed-task.mjs';

const result = await commerceSeedTask({ dryRun: true });
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
