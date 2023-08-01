import { programNodeRunFactory } from '../execClasses/programNodeRunFactory';
import { ProgramStateType } from '../execClasses/types';
import { PrintNode, ProgramNode, ProgramNodeTypes, RootNode } from '../types';
import * as ProgramNodeRunRunners from '../execClasses/BaseNodeRun';
import { ProgramNodeRun } from '../execClasses/BaseNodeRun';
import {
	getTemporalClient,
	startNodeWorkflow,
} from '../../utilTemporal/client';
import { randomUUID } from 'crypto';

// export function run(
// 	node: NonNullable<ProgramNode>,
// 	state: ProgramStateType,
// 	rootWorkflowId: string | null,
// ) {
// 	return programNodeRunFactory(node).run(state, rootWorkflowId);
// }

// export function arbAct<
// NP extends NonNullable<ProgramNode> infer R,
// NPR extends {new (n:NP):ProgramNodeRun }&typeof ProgramNodeRunRunners,

// NRI extends InstanceType<NPR>

// >(node: NP,creation: keyof typeof ProgramNodeRunRunners,methodName:string):NRI{
// 	return new ProgramNodeRunRunners[creation](node)
// if(node?.type==='if'){
// 	return new  ProgramNodeRunRunners['IfNodeRun'](node)
// }

// 	if(methodName==='run'){

// 			//[methodName]()
// 	}

// }

// type G <K >=K extends typeof ProgramNodeRunRunners  S:never

type ConstructorExtractor<
	Clazz,
	ConstructorArg extends { type: T },
	IType,
	T,
> = Clazz extends { new (a: ConstructorArg): IType; nodeType: T }
	? Clazz
	: never;

type MethodsOf<ClassInstance> = {
	[MaybeFunction in keyof ClassInstance]: ClassInstance[MaybeFunction] extends Function
		? MaybeFunction
		: never;
};

type ValidKeyOf<X, Y> = {
	[MaybeValue in keyof X as X[MaybeValue] extends Y
		? MaybeValue
		: never]: X[MaybeValue];
};

//type ValidKeyOf<X ,Y>= X extends  {'nodeType':Y } ? X :never

//type ValidInUnion<>

export async function activityStartWorkflow(
	node: NonNullable<ProgramNode>,
	state: ProgramStateType,
	rootWorkflowId: string | null,
) {
	const handle = await startNodeWorkflow(
		getTemporalClient(),
		node,
		state,
		rootWorkflowId,
	);
	return handle.workflowId;
}

export async function activityGetWorkflowResultByWorkflowId(
	workflowId: string,
): Promise<ProgramStateType> {
	return getTemporalClient().workflow.result(workflowId);
}

export function activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
	IMethod extends (...args: any) => any,
	NodeType = ProgramNode,
>(
	node: ProgramNode,
	methodName: string,
	...args: Parameters<IMethod>
): ReturnType<IMethod> {
	//@ts-expect-error
	return programNodeRunFactory(node)[methodName](...args);
}

export type ActivityUtilsObject = {
	randomUUID: typeof randomUUID;
	getTemporalClient: typeof getTemporalClient;
	startNodeWorkflow: typeof startNodeWorkflow;
};

type OmitFirstArg<X extends (a: any) => any, FirstArg> = X extends (
	utilsObject: FirstArg,
	...restOf: infer RestOfParams
) => any
	? RestOfParams
	: never;

export function activityRunArbitrayProgramNodeRunMethodWithUtilsObjectNotTypeChecked<
	IMethod extends (...args: any) => any,

	// x extends Parameters<IMethod> extends (
	// 	utilsObject: ActivityUtilsObject,
	// 	...restOf: infer RestOfParams
	// ) => infer ReturnType
	// 	? RestOfParams
	// 	: never,
>(
	node: ProgramNode,
	methodName: string,
	...args: OmitFirstArg<IMethod, ActivityUtilsObject>
): ReturnType<IMethod> {
	const utilObj: ActivityUtilsObject = {
		getTemporalClient,
		randomUUID,
		startNodeWorkflow,
	};

	//@ts-expect-error
	return programNodeRunFactory(node)[methodName](utilObj, ...args);
}

// const x = activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
// 	InstanceType<
// 		typeof ProgramNodeRunRunners.PrintNodeRun
// 	>['actMethodExecNothing'],
// 	PrintNode
// >({ type: ProgramNodeTypes.PRINT, uuid: '', children: [] }, 'run',
// {
// 	values: [],
// 	variables: {},
// });
// type R = Parameters<typeof fetch> extends (
// 	context: Context,
// 	...restOf: infer RestOfParams
// ) => infer ReturnType
// 	? RestOfParams
// 	: never;
