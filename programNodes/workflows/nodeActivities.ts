import { programNodeRunFactory } from '../execClasses/programNodeRunFactory';
import { ProgramStateType } from '../execClasses/types';
import { PrintNode, ProgramNode, ProgramNodeTypes, RootNode } from '../types';
import * as ProgramNodeRunRunners from '../execClasses/BaseNodeRun';
import { ProgramNodeRun } from '../execClasses/BaseNodeRun';

export function run(
	node: NonNullable<ProgramNode>,
	state: ProgramStateType,
	rootWorkflowId: string | null,
) {
	return programNodeRunFactory(node).run(state, rootWorkflowId);
}

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

export function activityRunArbitrayProgramNodeRunMethodNotTypeChecked<
	IMethod extends (...args: any) => any,
	NodeType = never,
	IA extends NodeType = NodeType,
>(
	node: IA,
	methodName: string,
	...args: Parameters<IMethod>
): ReturnType<IMethod> {
	//@ts-expect-error
	return programNodeRunFactory(node)[methodName](...args);
}

// const x=activityRunArbitrayProgramNodeRunMethodNotTypeChecked<InstanceType<typeof ProgramNodeRunRunners.PrintNodeRun>['run'],PrintNode >({ type:ProgramNodeTypes.PRINT, uuid:'', children:[]},'run',{

// value:0,
// variables:{}

// },null)
