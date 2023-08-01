'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AutoRefresh() {
	const router = useRouter();

	useEffect(() => {
		const interval = setInterval(() => {
			router.refresh();
		}, 500);

		return () => {
			clearInterval(interval);
		};
	}, [router]);
	return <></>;
}
