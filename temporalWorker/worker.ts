import { Worker } from '@temporalio/worker';

import * as activities from '../programNodes/workflows/nodeActivities';
import { TEMPORAL_TASK_QUEUE } from '../utilTemporal/client';

async function run() {
	const worker = await Worker.create({
		workflowsPath: require.resolve('../programNodes/workflows/nodeWorkflow'),
		taskQueue: TEMPORAL_TASK_QUEUE,
		activities,
	});
	await worker.run();
}

run().catch((err) => {
	console.error(err);
});
