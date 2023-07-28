import { ProgramNode } from '../types';

import { proxyActivities } from '@temporalio/workflow';

import * as nodeActs from './nodeActivities';
import { ProgramStateType } from '../execClasses/types';

export type NodeWorkflowArg = {
	state: ProgramStateType;
	programNode: ProgramNode;
	rootWorkflowId: string | null;
};

export function nodeWorkflow(arg: NodeWorkflowArg): Promise<ProgramStateType> {
	const act = proxyActivities<typeof nodeActs>({});

	if (arg.programNode === null) {
		return new Promise(() => {
			return arg.state;
		});
	}

	return act.run(arg.programNode, arg.state, arg.rootWorkflowId);
}
