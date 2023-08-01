'use server';

import { customDataSignal } from '../../../../programNodes/workflows/nodeWorkflow';
import { getTemporalClient } from '../../../../utilTemporal/client';

export async function sendInput(text: string, wfid: string) {
	const handle = await getTemporalClient().workflow.getHandle(wfid);

	await handle.signal(customDataSignal, {
		response: text,
	});
}
