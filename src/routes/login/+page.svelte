<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<svelte:head><title>Login | hacker1db newsletter</title></svelte:head>
<section class="mx-auto max-w-md px-4 py-16">
	<h1 class="mb-6 text-2xl font-bold">Newsletter admin</h1>
	{#if data.denied}
		<p role="alert" class="mb-4">This account does not have newsletter admin access.</p>
		<form method="POST" action={resolve('/api/logout')}>
			<button class="rounded border px-4 py-2">Sign out</button>
		</form>
	{:else if data.configured}
		<p class="mb-4">Sign in securely to manage the newsletter.</p>
		<form method="POST"><button class="rounded border px-4 py-2">Continue to sign in</button></form>
	{:else}
		<p role="alert">Admin sign-in is temporarily unavailable.</p>
	{/if}
	<a class="mt-6 block text-blue-400" href={resolve('/')}>Back to home</a>
</section>
