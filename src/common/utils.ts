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