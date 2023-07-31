import { ProgramNode, ProgramNodeTypes } from '../types';
import {
	RootNodeRun,
	InputNodeRun,
	PrintNodeRun,
	ValueNodeRun,
	OperatorNodeRun,
	IfNodeRun,
	WhileNodeRun,
	VarLabelNodeRun,
	VarGetNodeRun,
	VarSetNodeRun,
	ProgramNodeRun,
} from './BaseNodeRun';

function fun(s: string, ...rgs: string[]) {}

export function programNodeRunFactory(node: NonNullable<ProgramNode>) {
	if (node.type === ProgramNodeTypes.ROOT) {
		return new RootNodeRun(node);
	} else if (node.type === ProgramNodeTypes.INPUT) {
		return new InputNodeRun(node);
	} else if (node.type === ProgramNodeTypes.PRINT) {
		return new PrintNodeRun(node);
	} else if (node.type === ProgramNodeTypes.VALUE) {
		return new ValueNodeRun(node);
	} else if (node.type === ProgramNodeTypes.OPERATOR) {
		return new OperatorNodeRun(node);
	} else if (node.type === ProgramNodeTypes.IF_STATMENT) {
		return new IfNodeRun(node);
	} else if (node.type === ProgramNodeTypes.WHILE_STATMENT) {
		return new WhileNodeRun(node);
	} else if (node.type === ProgramNodeTypes.VAR_LABEL) {
		return new VarLabelNodeRun(node);
	} else if (node.type === ProgramNodeTypes.VAR_GET) {
		return new VarGetNodeRun(node);
	} else {
		return new VarSetNodeRun(node);
	}
}
