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
	OperationTypes,
	ProgramNode,
	ProgramNodeTypes,
	RootNode,
} from '../../../programNodes/types';
import editorStyles from './editor.module.css';
import { useImmerReducer } from 'use-immer';
import DisableSSR from '../../_clientComponts/DisableSSR';

const EditorDispatchContext = createContext<
	Dispatch<ProgramEditorReducerAction>
>(() => {});

export function Editor() {
	const [editorState, dispatchEditorState] = useReducer(programEditorReducer, {
		type: ProgramNodeTypes.ROOT,
		uuid: crypto.randomUUID(),
		children: [],
	});

	const sideBarItems = Object.entries(ProgramNodeTypes).flatMap(([k, v]) => {
		if (v === ProgramNodeTypes.ROOT) {
			return [];
		}
		return <SidebarItem key={k} nodeType={v} />;
	});

	return (
		<EditorDispatchContext.Provider value={dispatchEditorState}>
			<div className={editorStyles.editor}>
				<div className={editorStyles.program}>
					<ProgramNodeUI node={editorState} />
					{/* <div style={{ width: '10000px', height: '10000px' }}>blah</div>
				program */}
					<DisableSSR>
						<pre>{JSON.stringify(editorState, null, '\t')}</pre>
					</DisableSSR>
				</div>
				<div>{sideBarItems}</div>
			</div>
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
			<>
				<div
					draggable
					onDragStart={(ev) => {
						ev.dataTransfer.setData(
							DraggableMimeTypes.MOVE_NODE,
							JSON.stringify(data),
						);
					}}
				>
					{JSON.stringify(data)}
					<div>
						No ui for {node.type}
						{node.uuid} {parentUuid}
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
				</div>
				<div className={editorStyles.nodeIndentChildren}>{childrenNodes}</div>
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
								},
							});
						} else {
							editorDispatch({
								type: 'addNodeNextToOtherNode',
								data: {
									parentUuid,
									nodeType: createData.nodeType,
									siblingUuid: props.siblingUuid,
									location: props.location,
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
								},
							});
						} else {
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
						}
					}
				} catch (err) {
					console.error(err);
				}
			}}
		></div>
	);
}

export type ProgramEditorReducerAction =
	| AddNodeAction
	| AddNodeActionRelativeToSibilng
	| DeleteNodeAction
	| MoveNodeAction
	| MoveNodeActionRelativeToSibilng;

export type AddNodeAction = {
	type: 'addNode';
	data: {
		parentUuid: string;
		nodeType: (typeof ProgramNodeTypes)[keyof typeof ProgramNodeTypes];
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

export function programEditorReducer(
	oldstate: ProgramNode,
	action: ProgramEditorReducerAction,
): ProgramNode {
	let state = structuredClone(oldstate);
	if (action.type === 'addNode') {
		const n = getNodeWithUUID(action.data.parentUuid, state);
		if (n !== undefined) {
			n.children.push(nodeFromNodeType(action.data.nodeType));
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
		const parentNode = getNodeWithUUID(action.data.selfUuid, state);

		if (nodeToMove !== undefined && parentNode !== undefined) {
			state = deleteNode(state, action.data.selfUuid);
			parentNode.children.push(nodeToMove);
		}
	} else if (action.type === 'moveNodeNextToOtherNode') {
		console.log(action);

		const nodeToMove = structuredClone(
			getNodeWithUUID(action.data.selfUuid, state),
		);

		if (nodeToMove !== undefined) {
			state = deleteNode(state, action.data.selfUuid);

			addNodeNextTo(
				state,
				action.data.siblingUuid,
				nodeToMove,
				action.data.location,
			);
		}
	}

	return state;
}

function deleteNode(state: ProgramNode, uuid: string) {
	if (state !== null) {
		state.children = state.children.flatMap((child) => {
			if (child === null) {
				return null;
			}

			if (child.uuid !== uuid) {
				return deleteNode(child, uuid);
			}
			return [];
		});
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
			children: [],
			valueType: 'number',
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
			children: [],
			opertation: OperationTypes.PLUS,
		};
	} else if (type === ProgramNodeTypes.IF_STATMENT) {
		return {
			type,
			uuid,
			children: [],
			conditionNode: null,
		};
	} else if (type === ProgramNodeTypes.WHILE_STATMENT) {
		return {
			type,
			uuid,
			children: [],
			conditionNode: null,
		};
	} else if (type === ProgramNodeTypes.VALUE) {
		return {
			type,
			uuid,
			children: [],
			value: '0',
			valueType: 'number',
		};
	} else if (type === ProgramNodeTypes.VAR_GET) {
		return {
			type,
			uuid,
			children: [],
			varuuid: '',
		};
	} else if (type === ProgramNodeTypes.VAR_SET) {
		return {
			type,
			uuid,
			children: [],
			varuuids: [''],
		};
	} else {
		return {
			type,
			uuid,
			children: [],
			name: '',
		};
	}
}
