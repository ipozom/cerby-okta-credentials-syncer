import 'dotenv/config';

import { runSyncCredentialsCommand } from './cli/syncCredentialsCommand.js';

const result = await runSyncCredentialsCommand(process.argv.slice(2), process.env);
console.log(JSON.stringify(result, null, 2));