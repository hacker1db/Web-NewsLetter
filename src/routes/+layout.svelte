<script lang="ts">
	import '../app.css';
	import Header from '$components/Header.svelte';
	import Footer from '$components/Footer.svelte';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: { userId: string | null }; children: Snippet } = $props();
</script>

<div style="display: flex; flex-direction: column; min-height: 100vh;">
	<Header isAdmin={!!data.userId} />

	<main style="flex: 1; max-width: 1024px; width: 100%; margin: 0 auto; padding: 2rem 1rem;">
		{@render children()}
	</main>

	<Footer />
</div>
