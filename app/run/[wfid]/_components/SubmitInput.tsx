'use client';
import { useState } from 'react';
import { MessageSignalInput } from '../../../../programNodes/workflows/nodeWorkflow';
import { sendInput } from '../_actions/sendInput';

export function SubmitInput({ message }: { message: MessageSignalInput }) {
	const [text, setText] = useState('');
	const [isSending, setIsSending] = useState(false);

	if (message.message.data.type !== 'input') {
		return <></>;
	}
	return (
		<>
			<input
				disabled={isSending}
				type={message.message.data.inputType === 'string' ? 'text' : 'number'}
				value={text}
				onChange={(ev) => {
					setText(ev.target.value);
				}}
			/>
			<button
				onClick={async () => {
					setIsSending(true);

					await sendInput(text, message.sendingWorkflowId);

					// new Promise((resolve)=>{
					// 	setTimeout(()=>{
					// 		resolve(true);
					// 	},100)
					// })
				}}
			>
				Send
			</button>
		</>
	);
}
