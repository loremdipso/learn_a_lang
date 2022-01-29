<script lang="ts">
	import { createEventDispatcher } from "svelte";
	let dispatch = createEventDispatcher();

	import Icon from "smelte/src/components/Icon";

	import Card from "../common/Card.svelte";
	import type { IWord } from "../interfaces";
	import { isTouchDevice } from "../common/utils";

	export let word: IWord;
	export let link: string | null;

	let isTouch = isTouchDevice();
</script>

<Card>
	<h5 slot="header" class="text-center relative">
		<div
			class="refresh-button cursor-pointer"
			on:click={() => dispatch("randomWord")}
		>
			<Icon>refresh</Icon>
		</div>
		<span class="text-secondary-600 font-bold">{word.key}</span>
	</h5>

	<div slot="body" class="p-5 pb-0 pt-3 text-gray-700 body-2">
		<div class="bg-black my-2 text-center cursor-pointer">
			<div
				class="p-5 opacity-0 hover:opacity-100 word"
				class:always-show={isTouch}
			>
				{word.value}
			</div>
		</div>

		{#if link}
			<div class="text-right">
				<a target="_blank" href={link}>still curious?</a>
			</div>
		{/if}
	</div>
</Card>

<style lang="scss">
	.word {
		word-wrap: break-word;
		min-height: 15rem;
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 4em;
	}

	.refresh-button {
		position: absolute;
		right: 0;
	}

	.always-show {
		opacity: 100;
	}
</style>
