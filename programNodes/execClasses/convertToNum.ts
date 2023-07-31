export function convertToNum(v: string | number) {
	if (typeof v === 'number') {
		return v;
	} else {
		const num = parseFloat(v);
		if (!Number.isNaN(num)) {
			return num;
		} else {
			return 0;
		}
	}
}

export function convertToStr(v: string | number) {
	if (typeof v === 'string') {
		return v;
	} else {
		return v.toString(10);
	}
}
