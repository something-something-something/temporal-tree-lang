import { ReactNode, useEffect, useState } from 'react';

export default function DisableSSR({
	children,
}: {
	children: ReactNode | ReactNode[];
}) {
	const [isServer, setIsServer] = useState(true);

	useEffect(() => {
		setIsServer(false);
	}, []);

	if (isServer) {
		return <></>;
	} else {
		return <>{children}</>;
	}
}
