import { Client } from '@temporalio/client';
import { ProgramNode } from '../programNodes/types';
import { ProgramStateType } from '../programNodes/execClasses/types';
import { nodeWorkflow } from '../programNodes/workflows/nodeWorkflow';
import { randomUUID } from 'crypto';

export const TEMPORAL_TASK_QUEUE = 'programexec';

export function getTemporalClient() {
	return new Client();
}

export async function startNodeWorkflow(
	client: Client,
	node: NonNullable<ProgramNode>,
	state: ProgramStateType,
	rootWorkflowId: string | null,
) {
	const workflowId = randomUUID();
	return await client.workflow.start(nodeWorkflow, {
		workflowId: workflowId,
		taskQueue: TEMPORAL_TASK_QUEUE,

		args: [
			{
				workflowId,
				state: state,
				programNode: node,
				rootWorkflowId: rootWorkflowId ?? workflowId,
			},
		],
	});
}
