export type ProgramStateType = {
	value: number | string;
	variables: StateOfVarables;
};

export type StateOfVarables = Record<string, VaraibleState>;

export type VaraibleState = {
	name: string;
	value: number | string;
};

export type ExecutionArg = {
	variables: StateOfVarables;

	values: (number | string)[];
};
