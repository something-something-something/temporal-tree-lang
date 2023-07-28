import {
	getTemporalClient,
	startNodeWorkflow,
} from '../../utilTemporal/client';
import {
	InputNode,
	PrintNode,
	ProgramNode,
	ProgramNodeTypes,
	RootNode,
	OperatorNode,
	IfStatmentNode,
	WhileStatmentNode,
	VarGetNode,
	VarLabelNode,
	VarSetNode,
	OperationTypes,
	ValueNode,
} from '../types';
import { ProgramStateType, ExecutionArg, StateOfVarables } from './types';

export abstract class BaseNodeRun<T extends NonNullable<ProgramNode>> {
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

export function convertToNum(v: string | number) {
	if (typeof v === 'number') {
		return v;
	} else {
		const num = parseFloat(v);
		if (!Number.isNaN(num)) {
			return num;
		} else {
			return 0;
		}
	}
}

export function convertToStr(v: string | number) {
	if (typeof v === 'string') {
		return v;
	} else {
		return v.toString(10);
	}
}

export class RootNodeRun extends BaseNodeRun<RootNode> {}
export class InputNodeRun extends BaseNodeRun<InputNode> {
	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		const printStr = execArgs.values.join('\n');
		//await signal parent

		//await get response

		return { value: 'somevalue', variables: execArgs.variables };
	}
}

export class ValueNodeRun extends BaseNodeRun<ValueNode> {
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
	async exec(execArgs: ExecutionArg): Promise<ProgramStateType> {
		const printStr = execArgs.values.join('\n');

		return { value: printStr, variables: execArgs.variables };
	}
}

export class OperatorNodeRun extends BaseNodeRun<OperatorNode> {
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
	async exec(execArgs: ExecutionArg) {
		const modifiedVarables: StateOfVarables = {};

		this.node.varuuids.forEach((vuuid, index) => {
			if (execArgs.values.length < index) {
				modifiedVarables[vuuid] = {
					value: execArgs.values[index],
					name: '',
				};
			}
		});

		const updatedVars = structuredClone(execArgs.variables);

		for (const [key, value] of Object.entries(modifiedVarables)) {
			if (Object.hasOwn(updatedVars, key)) {
				updatedVars[key].value = value.value;
			} else {
				updatedVars[key] = {
					name: '',
					value: 0,
				};
			}
		}

		return {
			variables: updatedVars,
			value: 0,
		};
	}
}

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
