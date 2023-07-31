import {
	getTemporalClient,
	startNodeWorkflow,
} from '../../utilTemporal/client';
import {
	InputNode,
	PrintNode,
	ProgramNode,
	RootNode,
	OperatorNode,
	IfStatmentNode,
	WhileStatmentNode,
	VarGetNode,
	VarLabelNode,
	VarSetNode,
	OperationTypes,
	ValueNode,
	ProgramNodeTypes,
} from '../types';
import { convertToNum, convertToStr } from './convertToNum';
import { ProgramStateType, ExecutionArg, StateOfVarables } from './types';

export type ProgramNodeRun =
	| OperatorNodeRun
	| PrintNodeRun
	| InputNodeRun
	| ValueNodeRun
	| VarGetNodeRun
	| VarLabelNodeRun
	| VarSetNodeRun
	| WhileNodeRun
	| IfNodeRun
	| RootNodeRun;

class BaseNodeRun<T extends NonNullable<ProgramNode>> {
	#node: T;

	constructor(node: T) {
		this.#node = node;
	}

	get node() {
		return this.#node;
	}

	async run(
		state: ProgramStateType,
		rootWorkflowId: string | null,
	): Promise<ProgramStateType> {
		const args = await this.execChildren(state, rootWorkflowId);
		return await this.exec(args, rootWorkflowId);
	}

	async execChildren(
		state: ProgramStateType,
		rootWorkflowId: string | null,
	): Promise<ExecutionArg> {
		const client = getTemporalClient();

		let values: (number | string)[] = [];
		let currState = structuredClone(state);

		for (let child of this.node.children) {
			if (child !== null) {
				const wfhandle = await startNodeWorkflow(
					client,
					child,
					currState,
					crypto.randomUUID(),
					rootWorkflowId,
				);

				const result = await wfhandle.result();
				values.push(result.value);
				currState.variables = result.variables;
			}
		}
		return {
			values,
			variables: currState.variables,
		};
	}

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
	): Promise<ProgramStateType> {
		return {
			value: 0,
			variables: execArgs.variables,
		};
	}
}

export class RootNodeRun extends BaseNodeRun<RootNode> {
	static nodeType = ProgramNodeTypes.ROOT;
}
export class InputNodeRun extends BaseNodeRun<InputNode> {
	static nodeType = ProgramNodeTypes.INPUT;
	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		const printStr = execArgs.values.join('\n');
		//await signal parent

		//await get response

		return { value: 'somevalue', variables: execArgs.variables };
	}
}

export class ValueNodeRun extends BaseNodeRun<ValueNode> {
	static nodeType = ProgramNodeTypes.VALUE;

	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		if (this.node.valueType === 'string') {
			return { value: this.node.value, variables: execArgs.variables };
		} else {
			return {
				value: convertToNum(this.node.value),
				variables: execArgs.variables,
			};
		}
	}
}

export class PrintNodeRun extends BaseNodeRun<PrintNode> {
	static nodeType = ProgramNodeTypes.PRINT;

	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		const printStr = execArgs.values.join('\n');

		return { value: printStr, variables: execArgs.variables };
	}
}

export class OperatorNodeRun extends BaseNodeRun<OperatorNode> {
	static nodeType = ProgramNodeTypes.OPERATOR;
	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		if (execArgs.values.length > 1) {
			return {
				value: execArgs.values.reduce((pv, cv) => {
					if (this.node.opertation === OperationTypes.EQUAL) {
						return pv === cv ? 1 : 0;
					} else if (this.node.opertation === OperationTypes.PLUS) {
						if (typeof pv === 'string') {
							return pv + convertToStr(cv);
						} else {
							return pv + convertToNum(cv);
						}
					} else if (this.node.opertation === OperationTypes.MINUS) {
						if (typeof pv === 'string') {
							return pv.replace(convertToStr(cv), '');
						} else {
							return pv - convertToNum(cv);
						}
					} else if (this.node.opertation === OperationTypes.GREATER_THAN) {
						return pv > cv ? 1 : 0;
					} else if (
						this.node.opertation === OperationTypes.GREATER_THAN_OR_EQUAL
					) {
						return pv >= cv ? 1 : 0;
					} else if (this.node.opertation === OperationTypes.LESS_THAN) {
						return pv < cv ? 1 : 0;
					} else if (
						this.node.opertation === OperationTypes.LESS_THAN_OR_EQUAL
					) {
						return pv <= cv ? 1 : 0;
					} else {
						return 0;
					}
				}),
				variables: execArgs.variables,
			};
		} else if (execArgs.values.length === 1) {
			return {
				value: execArgs.values[0],
				variables: execArgs.variables,
			};
		}
		return { value: 0, variables: execArgs.variables };
	}
}

export class IfNodeRun extends BaseNodeRun<IfStatmentNode> {
	static nodeType = ProgramNodeTypes.IF_STATMENT;

	async run(
		state: ProgramStateType,
		rootWorkflowId: string | null,
	): Promise<ProgramStateType> {
		if (this.node.conditionNode !== null) {
			const client = getTemporalClient();
			const condwfhandle = await startNodeWorkflow(
				client,
				this.node.conditionNode,
				state,
				crypto.randomUUID(),
				rootWorkflowId,
			);

			const condResult = await condwfhandle.result();

			if (condResult.value !== 0) {
				return super.run(condResult, rootWorkflowId);
			}
		}

		return {
			value: 0,
			variables: state.variables,
		};
	}
}

export class WhileNodeRun extends BaseNodeRun<WhileStatmentNode> {
	static nodeType = ProgramNodeTypes.WHILE_STATMENT;

	async run(
		state: ProgramStateType,
		rootWorkflowId: string | null,
	): Promise<ProgramStateType> {
		if (this.node.conditionNode !== null) {
			let dorun = true;
			const client = getTemporalClient();
			while (dorun) {
				const condwfhandle = await startNodeWorkflow(
					client,
					this.node.conditionNode,
					state,
					crypto.randomUUID(),
					rootWorkflowId,
				);

				const condResult = await await condwfhandle.result();

				dorun = condResult.value !== 0;
				if (dorun) {
					return super.run(condResult, rootWorkflowId);
				}
			}
		}

		return {
			value: 0,
			variables: state.variables,
		};
	}
}

export class VarLabelNodeRun extends BaseNodeRun<VarLabelNode> {
	static nodeType = ProgramNodeTypes.VAR_LABEL;

	async exec(execArgs: ExecutionArg) {
		const updatedVars = structuredClone(execArgs.variables);

		if (Object.hasOwn(updatedVars, this.node.uuid)) {
			updatedVars[this.node.uuid].name = this.node.name;
		} else {
			updatedVars[this.node.uuid] = {
				name: this.node.name,
				value: 0,
			};
		}

		return {
			variables: updatedVars,
			value: updatedVars[this.node.uuid].value,
		};
	}
}

export class VarGetNodeRun extends BaseNodeRun<VarGetNode> {
	static nodeType = ProgramNodeTypes.VAR_GET;
	async exec(execArgs: ExecutionArg) {
		if (Object.hasOwn(execArgs.variables, this.node.varuuid)) {
			return {
				value: execArgs.variables[this.node.varuuid].value,
				variables: execArgs.variables,
			};
		} else {
			return {
				value: 0,
				variables: execArgs.variables,
			};
		}
	}
}

export class VarSetNodeRun extends BaseNodeRun<VarSetNode> {
	static nodeType = ProgramNodeTypes.VAR_SET;

	async exec(execArgs: ExecutionArg) {
		const modifiedVarables: StateOfVarables = {};

		if (execArgs.values.length > 0) {
			modifiedVarables[this.node.varuuid] = {
				value: execArgs.values[0],
				name: '',
			};
		}
		const updatedVars = structuredClone(execArgs.variables);

		for (const [key, value] of Object.entries(modifiedVarables)) {
			if (Object.hasOwn(updatedVars, key)) {
				updatedVars[key].value = value.value;
			} else {
				updatedVars[key] = {
					name: '',
					value: value.value,
				};
			}
		}

		return {
			variables: updatedVars,
			value: 0,
		};
	}
}
