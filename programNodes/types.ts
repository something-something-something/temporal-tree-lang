export type ProgramNode =
	| RootNode
	| InputNode
	| PrintNode
	| OperatorNode
	| IfStatmentNode
	| WhileStatmentNode
	| ValueNode
	| VarLabelNode
	| VarGetNode
	| VarSetNode
	| null;

export const ProgramNodeTypes = {
	ROOT: 'root',
	INPUT: 'input',
	PRINT: 'print',
	OPERATOR: 'operator',
	IF_STATMENT: 'if',
	WHILE_STATMENT: 'while',
	VALUE: 'value',
	VAR_SET: 'varSet',
	VAR_GET: 'varGet',
	VAR_LABEL: 'varLabel',
} as const;

export const OperationTypes = {
	PLUS: '+',
	MINUS: '-',
	MULT: '*',
	DIV: '/',
	EQUAL: '=',
	NOT_EQUALS: '!=',
	GREATER_THAN: '>',
	LESS_THAN: '<',
	GREATER_THAN_OR_EQUAL: '>=',
	LESS_THAN_OR_EQUAL: '<=',
	OR: '||',
	AND: '&&',
} as const;

export interface BaseNode {
	type: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
	uuid: string;
	children: ProgramNode[];
}

export interface RootNode extends BaseNode {
	type: typeof ProgramNodeTypes.ROOT;
}

export interface InputNode extends BaseNode {
	type: typeof ProgramNodeTypes.INPUT;
	valueType: 'string' | 'number';
}

export interface PrintNode extends BaseNode {
	type: typeof ProgramNodeTypes.PRINT;
}

export interface OperatorNode extends BaseNode {
	type: typeof ProgramNodeTypes.OPERATOR;
	opertation: (typeof OperationTypes)[keyof typeof OperationTypes];
}

export interface IfStatmentNode extends BaseNode {
	type: typeof ProgramNodeTypes.IF_STATMENT;
	conditionNode: ProgramNode;
}
export interface WhileStatmentNode extends BaseNode {
	type: typeof ProgramNodeTypes.WHILE_STATMENT;
	conditionNode: ProgramNode;
}

export interface ValueNode extends BaseNode {
	type: typeof ProgramNodeTypes.VALUE;
	value: string;
	valueType: 'string' | 'number';
}

export interface VarGetNode extends BaseNode {
	type: typeof ProgramNodeTypes.VAR_GET;
	varuuid: string;
}
export interface VarSetNode extends BaseNode {
	type: typeof ProgramNodeTypes.VAR_SET;
	varuuid: string;
}
export interface VarLabelNode extends BaseNode {
	type: typeof ProgramNodeTypes.VAR_LABEL;
	name: string;
}
