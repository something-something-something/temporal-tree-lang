import { Client } from '@temporalio/client';
import { ProgramNode } from '../programNodes/types';
import { ProgramStateType } from '../programNodes/execClasses/types';
import { nodeWorkflow } from '../programNodes/workflows/nodeWorkflow';

export function getTemporalClient() {
	return new Client();
}

export async function startNodeWorkflow(
	client: Client,
	node: NonNullable<ProgramNode>,
	state: ProgramStateType,
	workflowId: string,
	rootWorkflowId: string | null,
) {
	return await client.workflow.start(nodeWorkflow, {
		workflowId: workflowId,
		taskQueue: 'programexec',

		args: [
			{
				state: state,
				programNode: node,
				rootWorkflowId: rootWorkflowId,
			},
		],
	});
}
