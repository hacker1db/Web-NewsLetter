<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let loading = $state(false);
	let error = $state('');

	async function subscribe(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = '';

		try {
			const form = event.currentTarget as HTMLFormElement;
			const response = await fetch('/api/subscribe', {
				method: 'POST',
				body: new FormData(form)
			});
			const result = (await response.json()) as { error?: string };

			if (!response.ok) {
				error = result.error ?? 'Something went wrong. Please try again.';
				return;
			}

			await goto('/success/');
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<form
	method="POST"
	action="/api/subscribe"
	onsubmit={subscribe}
	style="display: flex; gap: 0.75rem; max-width: 440px; margin: 0 auto;"
>
	<input
		type="email"
		name="email"
		bind:value={email}
		placeholder="you@example.com"
		required
		disabled={loading}
		style="flex: 1; padding: 0.75rem 1rem; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; color: #ffffff; font-size: 1rem; outline: none; transition: border-color 0.2s ease;"
		onfocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#6FC1FF'; }}
		onblur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#374151'; }}
	/>
	<button
		type="submit"
		disabled={loading}
		style="padding: 0.75rem 1.5rem; background-color: #6FC1FF; color: #1a1d21; font-weight: 600; font-size: 1rem; border: none; border-radius: 0.5rem; cursor: pointer; transition: opacity 0.2s ease; white-space: nowrap;"
		onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
		onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
	>
		{#if loading}
			Sending...
		{:else}
			Subscribe
		{/if}
	</button>
</form>

{#if error}
	<p style="color: #f87171; font-size: 0.875rem; text-align: center; margin-top: 0.75rem;">
		{error}
	</p>
{/if}
