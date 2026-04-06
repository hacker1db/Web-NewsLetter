<script lang="ts">
	import { enhance } from '$app/forms';

	let { data }: { data: { subscriberCount: number } } = $props();

	let subject = $state('');
	let htmlBody = $state('');
	let sending = $state(false);
	let status = $state('');
</script>

<svelte:head>
	<title>Admin - hacker1db newsletter</title>
</svelte:head>

<section style="padding: 2rem 0;">
	<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
		<h1 style="font-size: 1.5rem; font-weight: 700; color: #ffffff;">
			<span style="color: #9ca3af;">$</span>
			<span style="color: #6FC1FF;"> admin</span>
			<span> --compose</span>
		</h1>

		<div style="display: flex; align-items: center; gap: 1rem;">
			<span style="display: inline-flex; align-items: center; gap: 0.5rem; background-color: rgba(111, 193, 255, 0.1); border: 1px solid rgba(111, 193, 255, 0.25); color: #6FC1FF; font-size: 0.875rem; font-weight: 500; padding: 0.375rem 1rem; border-radius: 9999px;">
				{data.subscriberCount} subscribers
			</span>

			<form method="POST" action="/api/logout/">
				<button
					type="submit"
					style="padding: 0.5rem 1rem; background-color: transparent; border: 1px solid #374151; border-radius: 0.5rem; color: #9ca3af; font-size: 0.875rem; cursor: pointer; transition: all 0.2s ease;"
					onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f87171'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
					onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
				>
					Logout
				</button>
			</form>
		</div>
	</div>

	<form
		method="POST"
		action="?/send"
		use:enhance={() => {
			sending = true;
			status = 'Sending newsletter...';
			return async ({ result }) => {
				sending = false;
				if (result.type === 'success' && result.data) {
					const d = result.data as { sent?: number; failed?: number };
					status = `Sent to ${d.sent ?? 0} subscribers. ${d.failed ? `${d.failed} failed.` : ''}`;
					subject = '';
					htmlBody = '';
				} else if (result.type === 'failure') {
					status = `Error: ${(result.data as { error?: string })?.error ?? 'Send failed.'}`;
				} else {
					status = 'Something went wrong.';
				}
			};
		}}
	>
		<div style="margin-bottom: 1.5rem;">
			<label for="subject" style="display: block; color: #d1d5db; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem;">
				Subject
			</label>
			<input
				type="text"
				id="subject"
				name="subject"
				bind:value={subject}
				required
				placeholder="This week in security..."
				style="width: 100%; padding: 0.75rem 1rem; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; color: #ffffff; font-size: 1rem; outline: none; transition: border-color 0.2s ease;"
				onfocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#6FC1FF'; }}
				onblur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#374151'; }}
			/>
		</div>

		<div style="margin-bottom: 1.5rem;">
			<label for="htmlBody" style="display: block; color: #d1d5db; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem;">
				HTML Body
			</label>
			<textarea
				id="htmlBody"
				name="htmlBody"
				bind:value={htmlBody}
				required
				rows={12}
				placeholder="<h2>This week...</h2><p>Here's what happened.</p>"
				style="width: 100%; padding: 0.75rem 1rem; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; color: #ffffff; font-size: 0.9rem; font-family: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, 'Courier New', monospace; outline: none; resize: vertical; transition: border-color 0.2s ease;"
				onfocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#6FC1FF'; }}
				onblur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#374151'; }}
			></textarea>
		</div>

		<div style="display: flex; align-items: center; gap: 1rem;">
			<button
				type="submit"
				disabled={sending}
				style="padding: 0.75rem 2rem; background-color: #6FC1FF; color: #1a1d21; font-weight: 600; font-size: 1rem; border: none; border-radius: 0.5rem; cursor: pointer; transition: opacity 0.2s ease;"
				onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
				onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
			>
				{#if sending}
					Sending...
				{:else}
					Send Newsletter
				{/if}
			</button>

			{#if status}
				<span style="color: {status.startsWith('Error') ? '#f87171' : '#34d399'}; font-size: 0.875rem;">
					{status}
				</span>
			{/if}
		</div>
	</form>
</section>
