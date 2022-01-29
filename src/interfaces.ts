
export interface ILanguage {
	name: string;
	words: IWord[];
}

export interface IWord {
	value: string;
	translation: string;
	part_of_speech: string;
}
