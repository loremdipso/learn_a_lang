<script lang="ts">
	let clazz: string = "";
	export { clazz as class };
</script>

<div class="bg-gray-300 p-2 m-2 max-w-2xl ml-auto mr-auto rounded-lg {clazz}">
	{#if $$slots.header}
		<div class="header">
			<slot name="header" />
		</div>
	{/if}

	{#if $$slots.body}
		<div class="body">
			<slot name="body" />
		</div>
	{/if}
</div>

<style lang="scss">
	.card {
		display: flex;
		flex-direction: row;

		.header {
			text-align: center;
		}
	}
</style>
