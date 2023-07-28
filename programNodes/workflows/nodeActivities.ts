import { programNodeRunFactory } from '../execClasses/BaseNodeRun';
import { ProgramStateType } from '../execClasses/types';
import { ProgramNode } from '../types';

export function run(
	node: NonNullable<ProgramNode>,
	state: ProgramStateType,
	rootWorkflowId: string | null,
) {
	return programNodeRunFactory(node).run(state, rootWorkflowId);
}
