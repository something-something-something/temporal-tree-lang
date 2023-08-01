'use server';

import { ProgramNode } from '../../../programNodes/types';
import {
	getTemporalClient,
	startNodeWorkflow,
} from '../../../utilTemporal/client';

export async function startWorkflow(node: NonNullable<ProgramNode>) {
	const handle = await startNodeWorkflow(
		getTemporalClient(),
		node,
		{
			value: 0,
			variables: {},
		},
		null,
	);

	return handle.workflowId;
}
