'use client';
import {
	Dispatch,
	Fragment,
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useReducer,
	useState,
} from 'react';
import {
	BaseNode,
	InputNode,
	OperationTypes,
	OperatorNode,
	ProgramNode,
	ProgramNodeTypes,
	RootNode,
	ValueNode,
	VarGetNode,
	VarLabelNode,
	VarSetNode,
} from '../../../programNodes/types';
import editorStyles from './editor.module.css';
import { useImmerReducer } from 'use-immer';
import DisableSSR from '../../_clientComponts/DisableSSR';
import { startWorkflow } from '../_actions/startWorkflow';
import Link from 'next/link';

const EditorDispatchContext = createContext<
	Dispatch<ProgramEditorReducerAction>
>(() => {});

const EditorStateContext = createContext<ProgramNode>(null);

export function Editor() {
	const [editorState, dispatchEditorState] = useReducer(programEditorReducer, {
		type: ProgramNodeTypes.ROOT,
		uuid: crypto.randomUUID(),
		children: [],
	});
	const [showDirectInput, setShowDirectInput] = useState(false);

	const [workflowID, setWorkflowID] = useState<string | null>(null);

	const sideBarItems = Object.entries(ProgramNodeTypes).flatMap(([k, v]) => {
		if (v === ProgramNodeTypes.ROOT) {
			return [];
		}
		return <SidebarItem key={k} nodeType={v} />;
	});

	return (
		<EditorDispatchContext.Provider value={dispatchEditorState}>
			<EditorStateContext.Provider value={editorState}>
				<div className={editorStyles.editor}>
					<div className={editorStyles.program}>
						<button
							type="button"
							onClick={async () => {
								if (editorState !== null) {
									setWorkflowID(await startWorkflow(editorState));
								}
							}}
						>
							Start workflow
						</button>
						{workflowID !== null && (
							<Link href={`/run/${workflowID}`}>{workflowID}</Link>
						)}

						<ProgramNodeUI node={editorState} />
						{/* <div style={{ width: '10000px', height: '10000px' }}>blah</div>
				program */}
						<DisableSSR>
							<pre>{JSON.stringify(editorState, null, '\t')}</pre>
						</DisableSSR>
						<button
							onClick={() => {
								setShowDirectInput((curr) => {
									return !curr;
								});
							}}
						>
							DirectInput
						</button>
						{showDirectInput && (
							<>
								<br />
								<DirectInput />
							</>
						)}
					</div>
					<div>{sideBarItems}</div>
				</div>
			</EditorStateContext.Provider>
		</EditorDispatchContext.Provider>
	);
}

export type ProgramNodeCreateData = {
	nodeType: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
};

export type ProgramNodeMoveData = {
	oldParentUuid: string;
	selfUuid: string;
};

export const DraggableMimeTypes = {
	CREATE_NODE: 'text/x-create-program-node',
	MOVE_NODE: 'text/x-move-program-node',
} as const;

function SidebarItem({
	nodeType,
}: {
	nodeType: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
}) {
	return (
		<div
			draggable
			onDragStart={(ev) => {
				const data: ProgramNodeCreateData = {
					nodeType,
				};
				ev.dataTransfer.setData(
					DraggableMimeTypes.CREATE_NODE,
					JSON.stringify(data),
				);
			}}
			className={editorStyles.sideBarItem}
		>
			{nodeType}
		</div>
	);
}

function DirectInput() {
	const [text, setText] = useState('');
	const editorDispatch = useContext(EditorDispatchContext);

	return (
		<>
			<textarea
				value={text}
				onChange={(ev) => {
					setText(ev.target.value);
				}}
			/>
			<br />
			<button
				type="button"
				onClick={() => {
					editorDispatch({
						type: 'directInput',
						data: {
							node: JSON.parse(text),
						},
					});
				}}
			>
				Submit Input (You may break things!)
			</button>
		</>
	);
}

function ProgramNodeUI({
	node,
	parentUuid,
}: {
	node: ProgramNode;
	parentUuid?: string;
}) {
	const editorDispatch = useContext(EditorDispatchContext);
	if (node === null) {
		return <>Null</>;
	}

	const childrenNodes =
		node.children.length > 0 ? (
			node.children.flatMap((child) => {
				if (child === null) {
					return [];
				}

				return (
					<Fragment key={child.uuid}>
						<EmptyStamentBox
							type="placeChildRelative"
							parentUuid={node.uuid}
							siblingUuid={child.uuid}
							location="above"
						/>
						<ProgramNodeUI node={child} parentUuid={node.uuid} />
						<EmptyStamentBox
							type="placeChildRelative"
							parentUuid={node.uuid}
							siblingUuid={child.uuid}
							location="below"
						/>
					</Fragment>
				);
			})
		) : (
			<EmptyStamentBox type="placeOnlyChild" parentUuid={node.uuid} />
		);

	if (node.type === 'root') {
		return <RootNodeUI node={node}>{childrenNodes}</RootNodeUI>;
	} else {
		const data: ProgramNodeMoveData = {
			oldParentUuid: parentUuid ?? '',
			selfUuid: node.uuid,
		};

		return (
			<div className={editorStyles.node}>
				<div
					className={editorStyles.draggableNode}
					draggable
					onDragStart={(ev) => {
						ev.dataTransfer.setData(
							DraggableMimeTypes.MOVE_NODE,
							JSON.stringify(data),
						);
					}}
				>
					{node.type}
				</div>
				{/* {JSON.stringify(data)} */}
				<div>
					<NodeConfigControls node={node} />

					<button
						type="button"
						onClick={() => {
							editorDispatch({
								type: 'deleteNode',
								data: {
									parentUuid: parentUuid ?? '',
									selfUuid: node.uuid,
								},
							});
						}}
					>
						Delete
					</button>
				</div>

				<div className={editorStyles.nodeIndentChildren}>{childrenNodes}</div>
			</div>
		);
	}
}

function NodeConfigControls({ node }: { node: ProgramNode }) {
	const editorDispatch = useContext(EditorDispatchContext);

	const editorState = useContext(EditorStateContext);
	if (node === null) {
		return <></>;
	} else if (node.type === ProgramNodeTypes.INPUT) {
		return (
			<>
				Type of userinput
				<select
					value={node.valueType}
					onChange={(ev) => {
						const v = ev.target.value;
						if ('number' === v || 'string' === v) {
							editorDispatch({
								type: 'updateSimpleNodeValue',
								data: {
									uuid: node.uuid,
									nodeType: node.type,
									key: 'valueType',
									value: v,
								},
							});
						}
					}}
				>
					<option value="number">number</option>
					<option value="string">string</option>
				</select>
			</>
		);
	} else if (node.type === ProgramNodeTypes.OPERATOR) {
		return (
			<>
				Type of operator
				<select
					value={node.opertation}
					onChange={(ev) => {
						const v = ev.target.value;
						const result = Object.values(OperationTypes).filter((z) => {
							return z === v;
						});

						if (result.length > 0) {
							editorDispatch({
								type: 'updateSimpleNodeValue',
								data: {
									uuid: node.uuid,
									nodeType: node.type,
									key: 'opertation',
									value: result[0],
								},
							});
						}
					}}
				>
					{Object.entries(OperationTypes).map(([key, value]) => {
						return (
							<option key={value} value={value}>
								{value}
							</option>
						);
					})}
				</select>
			</>
		);
	} else if (node.type === ProgramNodeTypes.VALUE) {
		return (
			<>
				Type of value
				<select
					value={node.valueType}
					onChange={(ev) => {
						const v = ev.target.value;
						if ('number' === v || 'string' === v) {
							editorDispatch({
								type: 'updateSimpleNodeValue',
								data: {
									uuid: node.uuid,
									nodeType: node.type,
									key: 'valueType',
									value: v,
								},
							});
						}
					}}
				>
					<option value="number">number</option>
					<option value="string">string</option>
				</select>
				<input
					type={node.valueType === 'string' ? 'text' : 'number'}
					value={node.value}
					onChange={(ev) => {
						editorDispatch({
							type: 'updateSimpleNodeValue',
							data: {
								uuid: node.uuid,
								nodeType: node.type,
								key: 'value',
								value: ev.target.value,
							},
						});
					}}
				/>
			</>
		);
	} else if (node.type === ProgramNodeTypes.VAR_LABEL) {
		return (
			<>
				Name
				<input
					type="text"
					value={node.name}
					onChange={(ev) => {
						editorDispatch({
							type: 'updateSimpleNodeValue',
							data: {
								uuid: node.uuid,
								nodeType: node.type,
								key: 'name',
								value: ev.target.value,
							},
						});
					}}
				/>
			</>
		);
	} else if (node.type === ProgramNodeTypes.VAR_GET) {
		return (
			<>
				Varable
				<select
					value={node.varuuid}
					onChange={(ev) => {
						ev.target.value;

						editorDispatch({
							type: 'updateSimpleNodeValue',
							data: {
								uuid: node.uuid,
								nodeType: node.type,
								key: 'varuuid',
								value: ev.target.value,
							},
						});
					}}
				>
					{' '}
					<option value="">Choose!</option>
					{getVarLabelNodes(editorState).map((n) => {
						return (
							<option key={n.uuid} value={n.uuid}>
								{n.name}
							</option>
						);
					})}
				</select>
			</>
		);
	} else if (node.type === ProgramNodeTypes.VAR_SET) {
		return (
			<>
				Varable
				<select
					value={node.varuuid}
					onChange={(ev) => {
						ev.target.value;

						editorDispatch({
							type: 'updateSimpleNodeValue',
							data: {
								uuid: node.uuid,
								nodeType: node.type,
								key: 'varuuid',
								value: ev.target.value,
							},
						});
					}}
				>
					<option value="">Choose!</option>
					{getVarLabelNodes(editorState).map((n) => {
						return (
							<option key={n.uuid} value={n.uuid}>
								{n.name}
							</option>
						);
					})}
				</select>
			</>
		);
	} else if (node.type === ProgramNodeTypes.IF_STATMENT) {
		return (
			<>
				will evaluate this first if true will run children
				{node.conditionNode === null ? (
					<EmptyStamentBox type="placeConditionNode" parentUuid={node.uuid} />
				) : (
					<ProgramNodeUI node={node.conditionNode} />
				)}
			</>
		);
	} else if (node.type === ProgramNodeTypes.WHILE_STATMENT) {
		return (
			<>
				will evaluate this first if true will run children then repat until it
				is false
				{node.conditionNode === null ? (
					<EmptyStamentBox type="placeConditionNode" parentUuid={node.uuid} />
				) : (
					<ProgramNodeUI node={node.conditionNode} />
				)}
			</>
		);
	} else {
		return (
			<>
				No ui for {node.type}
				{node.uuid}
			</>
		);
	}
}

function RootNodeUI({
	node,
	children,
}: {
	node: RootNode;
	children: ReactNode;
}) {
	return (
		<div>
			The root
			<div className={editorStyles.nodeIndentChildren}>{children}</div>
		</div>
	);
}

function EmptyStamentBox(
	props:
		| {
				type: 'placeOnlyChild';
				parentUuid: string;
		  }
		| {
				type: 'placeChildRelative';
				parentUuid: string;
				siblingUuid: string;
				location: 'above' | 'below';
		  }
		| {
				type: 'placeConditionNode';
				parentUuid: string;
		  },
) {
	const editorDispatch = useContext(EditorDispatchContext);

	const [showCanDrag, setShowCanDrag] = useState(false);

	const { parentUuid } = { ...props };

	const classNames = [editorStyles.emptyStatmentBox];
	if (showCanDrag) {
		classNames.push(editorStyles.canDrag);
	}
	return (
		<div
			className={classNames.join(' ')}
			onDragEnd={() => {
				setShowCanDrag(false);
			}}
			onDragEnter={() => {
				setShowCanDrag(true);
			}}
			onDragOver={(ev) => {
				ev.dataTransfer.dropEffect = 'move';

				ev.preventDefault();
			}}
			onDragLeave={() => {
				setShowCanDrag(false);
			}}
			onDrop={(ev) => {
				setShowCanDrag(false);
				try {
					const createDataContent = ev.dataTransfer.getData(
						DraggableMimeTypes.CREATE_NODE,
					);

					if (createDataContent !== '') {
						const createData: ProgramNodeCreateData =
							JSON.parse(createDataContent);

						if (props.type === 'placeOnlyChild') {
							editorDispatch({
								type: 'addNode',
								data: {
									parentUuid,
									nodeType: createData.nodeType,
									isConditionNode: false,
								},
							});
						} else if (props.type === 'placeChildRelative') {
							editorDispatch({
								type: 'addNodeNextToOtherNode',
								data: {
									parentUuid,
									nodeType: createData.nodeType,
									siblingUuid: props.siblingUuid,
									location: props.location,
								},
							});
						} else if (props.type === 'placeConditionNode') {
							editorDispatch({
								type: 'addNode',
								data: {
									parentUuid,
									nodeType: createData.nodeType,
									isConditionNode: true,
								},
							});
						}
					}
				} catch (err) {
					console.error(err);
				}

				try {
					const moveDataContent = ev.dataTransfer.getData(
						DraggableMimeTypes.MOVE_NODE,
					);

					if (moveDataContent !== '') {
						const moveData: ProgramNodeMoveData = JSON.parse(moveDataContent);

						if (props.type === 'placeOnlyChild') {
							editorDispatch({
								type: 'moveNode',
								data: {
									nextParentUuid: parentUuid,

									selfUuid: moveData.selfUuid,
									oldParentUuid: moveData.oldParentUuid,
									isConditionNode: false,
								},
							});
						} else if (props.type === 'placeChildRelative') {
							editorDispatch({
								type: 'moveNodeNextToOtherNode',
								data: {
									nextParentUuid: props.parentUuid,
									siblingUuid: props.siblingUuid,
									oldParentUuid: moveData.oldParentUuid,
									selfUuid: moveData.selfUuid,
									location: props.location,
								},
							});
						} else if (props.type === 'placeConditionNode') {
							editorDispatch({
								type: 'moveNode',
								data: {
									nextParentUuid: parentUuid,

									selfUuid: moveData.selfUuid,
									oldParentUuid: moveData.oldParentUuid,
									isConditionNode: true,
								},
							});
						}
					}
				} catch (err) {
					console.error(err);
				}
			}}
		>
			{props.type === 'placeChildRelative'
				? 'Drop to make Sibling'
				: props.type === 'placeOnlyChild'
				? 'Drop to make Child'
				: 'Drop for Condition'}
		</div>
	);
}

export type ProgramEditorReducerAction =
	| DirectInputAction
	| AddNodeAction
	| AddNodeActionRelativeToSibilng
	| DeleteNodeAction
	| MoveNodeAction
	| MoveNodeActionRelativeToSibilng
	| UpdateSimpleNodeValueAction<ValueNode, 'value'>
	| UpdateSimpleNodeValueAction<ValueNode, 'valueType'>
	| UpdateSimpleNodeValueAction<VarGetNode, 'varuuid'>
	| UpdateSimpleNodeValueAction<VarLabelNode, 'name'>
	| UpdateSimpleNodeValueAction<InputNode, 'valueType'>
	| UpdateSimpleNodeValueAction<OperatorNode, 'opertation'>
	| UpdateSimpleNodeValueAction<VarSetNode, 'varuuid'>;

export type DirectInputAction = {
	type: 'directInput';
	data: {
		node: NonNullable<ProgramNode>;
	};
};

export type AddNodeAction = {
	type: 'addNode';
	data: {
		parentUuid: string;
		nodeType: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
		isConditionNode: boolean;
	};
};

export type AddNodeActionRelativeToSibilng = {
	type: 'addNodeNextToOtherNode';
	data: {
		parentUuid: string;
		nodeType: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
		siblingUuid: string;
		location: 'above' | 'below';
	};
};

export type DeleteNodeAction = {
	type: 'deleteNode';
	data: {
		parentUuid: string;
		selfUuid: string;
	};
};

export type MoveNodeAction = {
	type: 'moveNode';
	data: {
		oldParentUuid: string;
		selfUuid: string;
		nextParentUuid: string;
		isConditionNode: boolean;
	};
};

export type MoveNodeActionRelativeToSibilng = {
	type: 'moveNodeNextToOtherNode';
	data: {
		oldParentUuid: string;
		selfUuid: string;
		nextParentUuid: string;
		siblingUuid: string;
		location: 'above' | 'below';
	};
};

// type x<T extends NonNullable<ProgramNode>> = T[keyof T];

export type UpdateSimpleNodeValueAction<
	T extends NonNullable<ProgramNode>,
	K extends keyof T,
> = {
	type: 'updateSimpleNodeValue';
	data: {
		key: K;
		nodeType: T['type'];
		value: T[K];
		uuid: string;
	};
};

// const s:ProgramNode={
// 	uuid:'hsdfjjhsdf',
// 	type:ProgramNodeTypes.INPUT,
// 	//value:'',
// 	valueType:'string',
// 	children:[]
// }

// // const z:ProgramEditorReducerAction={
// // 	type:'updateSimpleNodeValue',data:{
// // 		uuid:'abc',
// // 		nodeType:ProgramNodeTypes.INPUT,
// // 		key:'valueType',
// // 		value:'string'
// // 	}
// // }

// function x(s:ValueNode,z:ProgramEditorReducerAction){

// 	if(z.type==='updateSimpleNodeValue'){
// 		if(s.type===z.data.nodeType){

// 			if(z.data.key==='value'){
// 				s[z.data.key]=z.data.value
// 			}
// 			else if(z.data.key==='valueType'){
// 				s[z.data.key]=z.data.value
// 			}

// 	}

// 	}

// }

export function programEditorReducer(
	oldstate: ProgramNode,
	action: ProgramEditorReducerAction,
): ProgramNode {
	//todo dont do this
	let state = structuredClone(oldstate);
	if (action.type === 'addNode') {
		const n = getNodeWithUUID(action.data.parentUuid, state);
		if (n !== undefined) {
			if (!action.data.isConditionNode) {
				n.children.push(nodeFromNodeType(action.data.nodeType));
			} else if (
				action.data.isConditionNode &&
				(n.type === ProgramNodeTypes.IF_STATMENT ||
					n.type === ProgramNodeTypes.WHILE_STATMENT)
			) {
				n.conditionNode = nodeFromNodeType(action.data.nodeType);
			}
		}
	} else if (action.type === 'addNodeNextToOtherNode') {
		const n = getNodeWithUUID(action.data.parentUuid, state);
		if (n !== undefined) {
			const modifiedChildren = n.children.flatMap((child) => {
				if (child === null) {
					return null;
				}
				if (child.uuid !== action.data.siblingUuid) {
					return child;
				} else {
					if (action.data.location === 'above') {
						return [nodeFromNodeType(action.data.nodeType), child];
					} else {
						return [child, nodeFromNodeType(action.data.nodeType)];
					}
				}
			});
			n.children = modifiedChildren;
		}
	} else if (action.type === 'deleteNode') {
		state = deleteNode(state, action.data.selfUuid);
		// const parentNode = getNodeWithUUID(action.data.parentUuid, state);
		// if (parentNode !== undefined) {
		// 	const modifiedChildren = parentNode.children.flatMap((child) => {
		// 		if (child === null) {
		// 			return null;
		// 		}
		// 		if (child.uuid !== action.data.selfUuid) {
		// 			return child;
		// 		} else {
		// 			return [];
		// 		}
		// 	});
		// 	parentNode.children = [...modifiedChildren];
		// }
	} else if (action.type === 'moveNode') {
		const nodeToMove = structuredClone(
			getNodeWithUUID(action.data.selfUuid, state),
		);
		const parentNode = getNodeWithUUID(action.data.nextParentUuid, state);

		if (nodeToMove !== undefined && parentNode !== undefined) {
			const tempstate = deleteNode(state, action.data.selfUuid);
			if (
				getNodeWithUUID(action.data.nextParentUuid, tempstate) !== undefined
			) {
				state = tempstate;
				const parentNodeMod = getNodeWithUUID(
					action.data.nextParentUuid,
					state,
				);

				if (parentNodeMod !== undefined) {
					if (
						(parentNodeMod.type === ProgramNodeTypes.IF_STATMENT ||
							parentNodeMod.type === ProgramNodeTypes.WHILE_STATMENT) &&
						action.data.isConditionNode
					) {
						parentNodeMod.conditionNode = nodeToMove;
					} else {
						parentNodeMod.children.push(nodeToMove);
					}
				}
			}
		}
	} else if (action.type === 'moveNodeNextToOtherNode') {
		console.log(action);

		const nodeToMove = structuredClone(
			getNodeWithUUID(action.data.selfUuid, state),
		);

		if (nodeToMove !== undefined) {
			const tempstate = deleteNode(state, action.data.selfUuid);
			if (getNodeWithUUID(action.data.siblingUuid, tempstate) !== undefined) {
				state = tempstate;

				addNodeNextTo(
					state,
					action.data.siblingUuid,
					nodeToMove,
					action.data.location,
				);
			}
		}
	} else if (action.type === 'updateSimpleNodeValue') {
		const nodeToEdit = getNodeWithUUID(action.data.uuid, state);

		if (nodeToEdit !== undefined && nodeToEdit.type === action.data.nodeType) {
			//theres probaly a better way to write this but typescript seems to like this way and thinks i could be lying when i dont write it this way
			if (
				action.data.nodeType === ProgramNodeTypes.VAR_LABEL &&
				nodeToEdit.type === ProgramNodeTypes.VAR_LABEL
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.VAR_GET &&
				nodeToEdit.type === ProgramNodeTypes.VAR_GET
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.VAR_SET &&
				nodeToEdit.type === ProgramNodeTypes.VAR_SET
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.VALUE &&
				nodeToEdit.type === ProgramNodeTypes.VALUE &&
				action.data.key === 'value'
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.VALUE &&
				nodeToEdit.type === ProgramNodeTypes.VALUE &&
				action.data.key === 'valueType'
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.OPERATOR &&
				nodeToEdit.type === ProgramNodeTypes.OPERATOR
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else if (
				action.data.nodeType === ProgramNodeTypes.INPUT &&
				nodeToEdit.type === ProgramNodeTypes.INPUT
			) {
				nodeToEdit[action.data.key] = action.data.value;
			} else {
				console.error(
					'updateSimpleNodeValue could not update did you miss a type?',
					action,
					nodeToEdit,
				);
			}
		} else {
			console.error(
				'updateSimpleNodeValue failed bad node',
				action,
				nodeToEdit,
			);
		}
	} else if (action.type === 'directInput') {
		state = action.data.node;
	}

	return state;
}

function deleteNode(state: Readonly<ProgramNode>, uuid: string) {
	if (state !== null) {
		let nextState = structuredClone<NonNullable<ProgramNode>>(state);

		if (
			(nextState.type === ProgramNodeTypes.IF_STATMENT ||
				nextState.type === ProgramNodeTypes.WHILE_STATMENT) &&
			nextState.conditionNode !== null
		) {
			if (nextState.conditionNode.uuid === uuid) {
				nextState.conditionNode = null;
			} else {
				nextState.conditionNode = deleteNode(nextState.conditionNode, uuid);
			}
		}

		nextState.children = state.children.flatMap((child) => {
			if (child === null) {
				return null;
			}

			if (child.uuid !== uuid) {
				return deleteNode(child, uuid);
			}
			return [];
		});
		return nextState;
	}
	return state;
}

function addNodeNextTo(
	state: ProgramNode,
	uuid: string,
	node: ProgramNode,
	location: 'above' | 'below',
) {
	if (state !== null) {
		state.children = [
			...state.children.flatMap((child) => {
				if (child === null) {
					return null;
				}

				if (child.uuid !== uuid) {
					return addNodeNextTo(child, uuid, node, location);
				}
				if (location === 'above') {
					return [node, child];
				} else {
					return [child, node];
				}
			}),
		];
	}
	return state;
}

function getNodeWithUUID(
	uuid: string,
	node: ProgramNode,
): NonNullable<ProgramNode> | undefined {
	if (node === null) {
		return undefined;
	}
	if (node.uuid === uuid) {
		return node;
	}

	if (
		node.type === ProgramNodeTypes.IF_STATMENT ||
		node.type === ProgramNodeTypes.WHILE_STATMENT
	) {
		const checkCondNode = getNodeWithUUID(uuid, node.conditionNode);
		if (checkCondNode !== undefined) {
			return checkCondNode;
		}
	}

	for (let c of node.children) {
		const search = getNodeWithUUID(uuid, c);
		if (search !== undefined) {
			return search;
		}
	}

	return undefined;
}

function getVarLabelNodes(node: ProgramNode): VarLabelNode[] {
	const resultsArr: VarLabelNode[] = [];

	if (node === null) {
		return [];
	}
	if (node.type === ProgramNodeTypes.VAR_LABEL) {
		resultsArr.push(node);
	}

	if (
		node.type === ProgramNodeTypes.IF_STATMENT ||
		node.type === ProgramNodeTypes.WHILE_STATMENT
	) {
		resultsArr.push(...getVarLabelNodes(node.conditionNode));
	}

	for (let c of node.children) {
		resultsArr.push(...getVarLabelNodes(c));
	}

	return resultsArr;
}

function nodeFromNodeType(
	type: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes],
): NonNullable<ProgramNode> {
	const uuid = crypto.randomUUID();

	if (type === ProgramNodeTypes.ROOT) {
		return { uuid, type, children: [] };
	} else if (type === ProgramNodeTypes.INPUT) {
		return {
			type,
			uuid,
			valueType: 'number',
			children: [],
		};
	} else if (type === ProgramNodeTypes.PRINT) {
		return {
			type,
			uuid,
			children: [],
		};
	} else if (type === ProgramNodeTypes.OPERATOR) {
		return {
			type,
			uuid,
			opertation: OperationTypes.PLUS,
			children: [],
		};
	} else if (type === ProgramNodeTypes.IF_STATMENT) {
		return {
			type,
			uuid,
			conditionNode: null,
			children: [],
		};
	} else if (type === ProgramNodeTypes.WHILE_STATMENT) {
		return {
			type,
			uuid,
			conditionNode: null,
			children: [],
		};
	} else if (type === ProgramNodeTypes.VALUE) {
		return {
			type,
			uuid,
			value: '0',
			valueType: 'number',
			children: [],
		};
	} else if (type === ProgramNodeTypes.VAR_GET) {
		return {
			type,
			uuid,
			varuuid: '',
			children: [],
		};
	} else if (type === ProgramNodeTypes.VAR_SET) {
		return {
			type,
			uuid,
			varuuid: '',
			children: [],
		};
	} else {
		return {
			type,
			uuid,
			name: '',
			children: [],
		};
	}
}
