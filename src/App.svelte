<script lang="ts">
	import GithubCorner from "./common/GithubCorner.svelte";
	import {
		getRandomElement,
		isTouchDevice,
		queryParamValue,
	} from "./common/utils";
	import SearchBar from "./components/SearchBar.svelte";
	import WordCard from "./components/WordCard.svelte";
	import DataJSON from "./data.json";
	import type { ILanguage, IWord } from "./interfaces";

	const withSearchBar = queryParamValue("withSearchBar") !== null;

	let showSearchDialog: boolean = false;

	let language = (DataJSON as any)[0] as ILanguage;

	let word: IWord;
	let link: string | null = null;
	function setRandomWord() {
		word = getRandomElement(language.words);

		if (language.name.toLocaleLowerCase() === "spanish") {
			link = `https://www.spanishdict.com/phrases/${word.value}`;
		}
	}

	setRandomWord();

	let isTouch = isTouchDevice();
	$: shouldShow = isTouch || showSearchDialog;
</script>

<svelte:head>
	<!-- Material Icons -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/icon?family=Material+Icons"
	/>
	<!-- Roboto -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,600,700"
	/>
	<!-- Roboto Mono -->
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css?family=Roboto+Mono"
	/>
</svelte:head>

<main class="pb-32 fade-in">
	<GithubCorner
		href="https://github.com/loremdipso/learn_a_lang"
		position="topRight"
		small
	/>
</main>

{#if withSearchBar}
	<SearchBar bind:showSearchDialog />
{/if}

<WordCard {word} {link} {shouldShow} on:randomWord={() => setRandomWord()} />

<style lang="scss">
	:global(html, body) {
		height: 100vh;
		overflow: hidden;
	}

	:global(a) {
		// TODO: figure out why this doesn't work
		// @apply text-blue-200;
		color: rgba(29, 142, 241, 1);
	}

	.slide-in-from-top {
		animation: 300ms cubic-bezier(0.17, 0.04, 0.03, 0.94) 0s 1 SlideDown;
	}
	@keyframes SlideDown {
		0% {
			transform: translate3d(0, -100%, 0);
		}
		100% {
			transform: translateZ(0);
		}
	}

	.fade-in {
		animation: 1s ease-out 0s 1 FadeIn;
	}
	@keyframes FadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
