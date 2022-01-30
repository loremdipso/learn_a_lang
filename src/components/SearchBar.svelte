<script lang="ts">
	import {
		isKeyAlphaNumeric,
		isProbablyUrl,
		redirectToUrl,
	} from "../common/utils";

	let searchString: string = "";
	export let showSearchDialog = false;
	function handleKeydown(event: KeyboardEvent) {
		const key = event.key;

		if (key === "Escape") {
			showSearchDialog = false;
			searchString = "";
		} else if (key === "Enter") {
			if (isProbablyUrl(searchString)) {
				redirectToUrl(searchString);
			} else {
				redirectToUrl(
					`https://www.google.com/search?q=${encodeURIComponent(
						searchString
					)}`
				);
			}
		} else if (!showSearchDialog && isKeyAlphaNumeric(key)) {
			searchString += key;
			event.preventDefault();
			showSearchDialog = true;
		}
	}

	let inputField;
	$: {
		if (inputField) {
			inputField.focus();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showSearchDialog}
	<div class="overlay" on:click={() => (showSearchDialog = false)} />
	<div class="fancy-input">
		<input bind:this={inputField} bind:value={searchString} />
	</div>
{/if}

<style lang="scss">
	.overlay {
		z-index: 9;
		background-color: black;
		opacity: 0.1;
		position: absolute;
		height: 100vh;
		width: 100vw;
		top: 0;
		left: 0;
	}

	.fancy-input {
		position: absolute;
		top: 10px;
		font-size: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		max-height: 80vh;
		max-width: 80vw;
		overflow: auto;

		> input {
			background-color: black;
			border-radius: 3rem;
			color: white;
			padding: 1rem;
		}
	}
</style>
