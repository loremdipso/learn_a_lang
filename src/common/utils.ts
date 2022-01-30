// Thanks https://stackoverflow.com/a/12646864 !!!
export function shuffleArray<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

export function getRandomElement<T>(arr: T[]): T {
	return arr[getRandomInt(0, arr.length) % arr.length];
}

export function getRandomInt(min: number, maxExclusive: number): number {
	return min + Math.floor(Math.random() * maxExclusive);
}

// Thanks https://stackoverflow.com/a/4819886
export function isTouchDevice() {
	return (('ontouchstart' in window) ||
		(navigator.maxTouchPoints > 0) ||
		((navigator as any).msMaxTouchPoints > 0));
}

// Thanks https://stackoverflow.com/a/901144
export function queryParamValue(param: string): string | null {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

export function isKeyAlphaNumeric(key: string): boolean {
	// TODO: is there something smarter we could do here?
	return key.length === 1 && (/[a-zA-Z0-9-_]/.test(key));
}

export function isProbablyUrl(value: string): boolean {
	if (/[ ]/.test(value)) {
		return false;
	}

	if (/\.com$/.test(value)) {
		return true;
	}

	return false;
}

export function redirectToUrl(url: string) {
	if (!url.startsWith("http")) {
		url = "https://" + url;
	}
	window.location.href = url;
}