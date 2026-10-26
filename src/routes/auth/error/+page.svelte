<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Sign-in failed | hacker1db newsletter</title></svelte:head>
<section class="mx-auto max-w-md px-4 py-16">
	<h1 class="mb-4 text-2xl font-bold">Sign-in could not be completed</h1>
	<p>Please start again to create a new secure sign-in session.</p>
	<a class="mt-6 block text-blue-400" href={resolve('/login/')}>Return to login</a>
</section>
