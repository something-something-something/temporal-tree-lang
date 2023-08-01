import { ProgramNode } from '../types';

import {
	ActivityInterfaceFor,
	defineQuery,
	defineSignal,
	proxyActivities,
	setHandler,
} from '@temporalio/workflow';

import type * as nodeActs from './nodeActivities';
import { ProgramStateType } from '../execClasses/types';
import { programNodeRunFactory } from '../execClasses/programNodeRunFactory';

export type NodeWorkflowArg = {
	state: ProgramStateType;
	programNode: ProgramNode;
	workflowId: string;
	rootWorkflowId: string | null;
};
export type NodeWorkflowActivities = ActivityInterfaceFor<typeof nodeActs>;

export interface MessageSignalInput {
	messageUuid: string;
	sendingWorkflowId: string;
	lastModifiedTime: number;
	message: {
		data: MessageDetails;
	};
}

type MessageDetails =
	| {
			type: 'input';
			show: boolean;
			inputType: string | number;
	  }
	| {
			type: 'print';
			text: string;
	  };

export const displayMessageSignal =
	defineSignal<[MessageSignalInput]>('sendMessage');
export interface MessageState extends MessageSignalInput {
	createdTime: number;
}

export const getMessageData = defineQuery<Record<string, MessageState>, []>(
	'getMessages',
);

export type CustomData =
	| { [key: string]: CustomData }
	| string
	| number
	| boolean
	| null
	| CustomData[];

export const customDataSignal = defineSignal<[CustomData]>('reciveData');

export const customDataQuery = defineQuery<CustomData, []>('sendData');

export function nodeWorkflow(arg: NodeWorkflowArg): Promise<ProgramStateType> {
	const act = proxyActivities<typeof nodeActs>({ startToCloseTimeout: '20s' });

	const messages: Record<string, MessageState> = {};

	setHandler(displayMessageSignal, (input) => {
		if (messages[input.messageUuid] !== undefined) {
			messages[input.messageUuid] = {
				createdTime: messages[input.messageUuid].createdTime ?? 0,

				...input,
			};
		} else {
			messages[input.messageUuid] = {
				createdTime: input.lastModifiedTime,

				...input,
			};
		}
	});

	setHandler(getMessageData, () => {
		return messages;
	});

	if (arg.programNode === null) {
		return new Promise(() => {
			return arg.state;
		});
	}

	return programNodeRunFactory(arg.programNode).run(
		arg.state,
		arg.rootWorkflowId,
		act,
		arg,
	);
}
