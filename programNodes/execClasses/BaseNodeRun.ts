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
import { ActivityUtilsObject } from '../workflows/nodeActivities';
import {
	NodeWorkflowActivities,
	NodeWorkflowArg,
	customDataSignal,
	displayMessageSignal,
} from '../workflows/nodeWorkflow';
import { convertToNum, convertToStr, isValueTrue } from './convertToNum';
import { ProgramStateType, ExecutionArg, StateOfVarables } from './types';
import { condition, setHandler } from '@temporalio/workflow';
import { z } from 'zod';

//structuredClone should work but i got weird errors probaly tsconfig issue
function fakeStructuredClone<X>(arg: X): X {
	return JSON.parse(JSON.stringify(arg));
}

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
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		const args = await this.execChildren(
			state,
			rootWorkflowId,
			activities,
			workflowArgs,
		);
		return await this.exec(args, rootWorkflowId, activities, workflowArgs);
	}

	async execChildren(
		state: ProgramStateType,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ExecutionArg> {
		let values: (number | string)[] = [];
		let currState = fakeStructuredClone(state);

		for (let child of this.node.children) {
			if (child !== null) {
				const childworkflowId = await activities.activityStartWorkflow(
					child,
					currState,
					rootWorkflowId,
				);

				const result = await activities.activityGetWorkflowResultByWorkflowId(
					childworkflowId,
				);
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
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof BaseNodeRun>['actMethodExecNothing'],
			typeof this.node
		>(this.node, 'actMethodExecNothing', execArgs);
	}

	async actMethodExecNothing(
		execArgs: ExecutionArg,
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
	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		const printStr = execArgs.values.join('\n');
		//await signal parent

		//await get response

		const messageuuid =
			await activities.activityRunArbitrayProgramNodeRunMethodWithUtilsObjectNotTypeChecked<
				InstanceType<typeof InputNodeRun>['actMethodCreteMessageUuid']
			>(this.node, 'actMethodCreteMessageUuid');

		let response: string | null = null;

		setHandler(customDataSignal, (data) => {
			const ResponseSchema = z.object({ response: z.string() });

			const result = ResponseSchema.safeParse(data);

			if (result.success) {
				response = result.data.response;
			}
		});

		await activities.activityRunArbitrayProgramNodeRunMethodWithUtilsObjectNotTypeChecked<
			InstanceType<typeof InputNodeRun>['actSendMessageToRoot']
		>(
			this.node,
			'actSendMessageToRoot',
			messageuuid,
			workflowArgs.workflowId,
			rootWorkflowId,
			true,
		);

		await condition(() => {
			return response !== null;
		});

		await activities.activityRunArbitrayProgramNodeRunMethodWithUtilsObjectNotTypeChecked<
			InstanceType<typeof InputNodeRun>['actSendMessageToRoot']
		>(
			this.node,
			'actSendMessageToRoot',
			messageuuid,
			workflowArgs.workflowId,
			rootWorkflowId,
			false,
		);

		return {
			value:
				this.node.valueType === 'string'
					? convertToStr(response ?? '')
					: convertToNum(response ?? 0),
			variables: execArgs.variables,
		};
	}

	actMethodCreteMessageUuid(utils: ActivityUtilsObject, ...h: []) {
		return utils.randomUUID();
	}

	async actSendMessageToRoot(
		util: ActivityUtilsObject,
		messageUUid: string,
		selfWfId: string,
		rootwfid: string | null,
		show: boolean,
	) {
		const handle = util.getTemporalClient().workflow.getHandle(rootwfid ?? '');
		handle.signal(displayMessageSignal, {
			messageUuid: messageUUid,
			sendingWorkflowId: selfWfId,
			lastModifiedTime: Date.now(),
			message: {
				data: {
					type: 'input',
					show: show,
					inputType: this.node.valueType,
				},
			},
		});
	}
}

export class ValueNodeRun extends BaseNodeRun<ValueNode> {
	static nodeType = ProgramNodeTypes.VALUE;

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
	): Promise<ProgramStateType> {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof ValueNodeRun>['actGetValue']
		>(this.node, 'actGetValue', execArgs);
	}

	async actGetValue(execArgs: ExecutionArg) {
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

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		return await activities.activityRunArbitrayProgramNodeRunMethodWithUtilsObjectNotTypeChecked<
			InstanceType<typeof PrintNodeRun>['actShowMessage']
		>(
			this.node,
			'actShowMessage',
			execArgs,
			workflowArgs.workflowId,
			rootWorkflowId,
		);
	}

	async actShowMessage(
		utils: ActivityUtilsObject,
		execArgs: ExecutionArg,
		selfWfId: string,
		rootwfid: string | null,
	) {
		const printStr = execArgs.values.join('\n');

		const handle = utils.getTemporalClient().workflow.getHandle(rootwfid ?? '');
		handle.signal(displayMessageSignal, {
			messageUuid: utils.randomUUID(),
			sendingWorkflowId: selfWfId,
			lastModifiedTime: Date.now(),
			message: {
				data: {
					type: 'print',
					text: printStr,
				},
			},
		});

		return { value: printStr, variables: execArgs.variables };
	}
}

export class OperatorNodeRun extends BaseNodeRun<OperatorNode> {
	static nodeType = ProgramNodeTypes.OPERATOR;

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
	): Promise<ProgramStateType> {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof OperatorNodeRun>['actDoOperation']
		>(this.node, 'actDoOperation', execArgs);
	}

	actDoOperation(execArgs: ExecutionArg) {
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
					} else if (this.node.opertation === OperationTypes.MULT) {
						return convertToNum(pv) * convertToNum(cv);
					} else if (this.node.opertation === OperationTypes.DIV) {
						return convertToNum(pv) / convertToNum(cv);
					} else if (this.node.opertation === OperationTypes.NOT_EQUALS) {
						return pv !== cv ? 1 : 0;
					} else if (this.node.opertation === OperationTypes.OR) {
						return isValueTrue(pv) > 0 || isValueTrue(cv) > 0 ? 1 : 0;
					} else if (this.node.opertation === OperationTypes.AND) {
						return isValueTrue(pv) > 0 && isValueTrue(cv) > 0 ? 1 : 0;
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
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		if (this.node.conditionNode !== null) {
			const condwfid = await activities.activityStartWorkflow(
				this.node.conditionNode,
				state,

				rootWorkflowId,
			);
			const condResult = await activities.activityGetWorkflowResultByWorkflowId(
				condwfid,
			);

			if (isValueTrue(condResult.value) > 0) {
				return super.run(condResult, rootWorkflowId, activities, workflowArgs);
			} else {
				return {
					value: 0,
					variables: condResult.variables,
				};
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
		activities: NodeWorkflowActivities,
		workflowArgs: NodeWorkflowArg,
	): Promise<ProgramStateType> {
		if (this.node.conditionNode !== null) {
			let dorun = true;

			let programState = state;

			while (dorun) {
				const condwfid = await activities.activityStartWorkflow(
					this.node.conditionNode,
					programState,

					rootWorkflowId,
				);

				const condResult =
					await activities.activityGetWorkflowResultByWorkflowId(condwfid);
				programState = condResult;
				dorun = isValueTrue(condResult.value) > 0;
				if (dorun) {
					const result = await super.run(
						condResult,
						rootWorkflowId,
						activities,
						workflowArgs,
					);
					programState = result;
				}
			}
			return {
				value: 0,
				variables: programState.variables,
			};
		}

		return {
			value: 0,
			variables: state.variables,
		};
	}
}

export class VarLabelNodeRun extends BaseNodeRun<VarLabelNode> {
	static nodeType = ProgramNodeTypes.VAR_LABEL;

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
	) {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof VarLabelNodeRun>['actSetLabel']
		>(this.node, 'actSetLabel', execArgs);
	}

	async actSetLabel(execArgs: ExecutionArg) {
		const updatedVars = fakeStructuredClone(execArgs.variables);

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
	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
	) {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof VarGetNodeRun>['actGetVarValue']
		>(this.node, 'actGetVarValue', execArgs);
	}

	async actGetVarValue(execArgs: ExecutionArg) {
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

	async exec(
		execArgs: ExecutionArg,
		rootWorkflowId: string | null,
		activities: NodeWorkflowActivities,
	) {
		return await activities.activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
			InstanceType<typeof VarSetNodeRun>['actUpdateVarables']
		>(this.node, 'actUpdateVarables', execArgs);
	}

	async actUpdateVarables(execArgs: ExecutionArg) {
		const modifiedVarables: StateOfVarables = {};
		if (execArgs.values.length > 0) {
			modifiedVarables[this.node.varuuid] = {
				value: execArgs.values[0],
				name: '',
			};
		}
		const updatedVars = fakeStructuredClone(execArgs.variables);

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
