<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Confirm subscription - hacker1db newsletter</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section style="text-align: center; padding: 4rem 1rem;">
	<div style="max-width: 480px; margin: 0 auto;">
		<div style="font-family: Monaco, Menlo, 'Courier New', monospace; font-size: 1.25rem; color: #6FC1FF; margin-bottom: 1.5rem;">
			confirm subscription
		</div>
		<p style="color: #d1d5db; font-size: 1.125rem; line-height: 1.6; margin-bottom: 2rem;">
			Confirm that you want to receive the hacker1db newsletter.
		</p>
		<form method="POST">
			<input type="hidden" name="token" value={data.token} />
			<button
				type="submit"
				style="padding: 0.75rem 1.5rem; background-color: #6FC1FF; color: #1a1d21; font-weight: 600; font-size: 1rem; border: none; border-radius: 0.5rem; cursor: pointer;"
			>
				Confirm subscription
			</button>
		</form>
	</div>
</section>
