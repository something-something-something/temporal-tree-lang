import { getMessageData } from '../../../programNodes/workflows/nodeWorkflow';
import { getTemporalClient } from '../../../utilTemporal/client';
import { AutoRefresh } from './_components/AutoRefresh';
import { SubmitInput } from './_components/SubmitInput';

export default async function RunWorkflowPage({
	params,
}: {
	params: { wfid: string };
}) {
	const wfHandle = await getTemporalClient().workflow.getHandle(params.wfid);

	const data = await wfHandle.query(getMessageData);

	//const e = await wfHandle.fetchHistory();

	//return <>{JSON.stringify(data)}</>;

	const display = [...Object.entries(data)]
		.sort(([ka, va], [kb, vb]) => {
			return va.createdTime - vb.createdTime;
		})
		.flatMap(([k, v]) => {
			if (v.message.data.type === 'print') {
				return <pre key={k}>{v.message.data.text}</pre>;
			} else {
				if (!v.message.data.show) {
					return [];
				} else {
					return <SubmitInput key={k} message={v} />;
				}
			}
		});

	return (
		<>
			{display.length > 0 ? display : <>No output</>}
			<AutoRefresh />
		</>
	);
}
