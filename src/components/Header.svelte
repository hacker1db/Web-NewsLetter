<script lang="ts">
	import { page } from '$app/state';
	import { siteConfig } from '$lib/config';

	let { isAdmin = false }: { isAdmin?: boolean } = $props();

	let mobileOpen = $state(false);

	let navLinks = $derived([
		{ href: '/', label: 'Home' },
		...(isAdmin ? [{ href: '/admin/', label: 'Admin' }] : [])
	]);
</script>

<header
	style="background-color: #1a1d21; border-bottom: 1px solid #374151; padding: 1rem 0;"
>
	<div
		style="max-width: 1024px; margin: 0 auto; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between;"
	>
		<a
			href="/"
			style="font-family: Monaco, Menlo, 'Courier New', monospace; font-size: 1.125rem; color: #6FC1FF; text-decoration: none; transition: color 0.2s ease;"
		>
			<span>{siteConfig.logo.text}</span>
			<span class="terminal-cursor" style="color: {siteConfig.logo.cursorColor}"></span>
		</a>

		<!-- Desktop nav -->
		<nav class="desktop-nav" style="display: flex; gap: 1.5rem;">
			{#each navLinks as link}
				<a
					href={link.href}
					style="color: {page.url.pathname === link.href ? '#6FC1FF' : '#d1d5db'}; text-decoration: none; transition: color 0.2s ease;"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<!-- Mobile hamburger -->
		<button
			type="button"
			class="mobile-toggle"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-label="Toggle navigation"
			style="display: none; background: none; border: 1px solid #374151; border-radius: 0.375rem; padding: 0.4rem 0.6rem; cursor: pointer; color: #d1d5db;"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				{#if mobileOpen}
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				{:else}
					<line x1="3" y1="12" x2="21" y2="12"></line>
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<line x1="3" y1="18" x2="21" y2="18"></line>
				{/if}
			</svg>
		</button>
	</div>

	<!-- Mobile nav -->
	{#if mobileOpen}
		<nav class="mobile-nav" style="max-width: 1024px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px solid #374151;">
			{#each navLinks as link}
				<a
					href={link.href}
					onclick={() => (mobileOpen = false)}
					style="color: {page.url.pathname === link.href ? '#6FC1FF' : '#d1d5db'}; text-decoration: none; padding: 0.5rem 0; transition: color 0.2s ease;"
				>
					{link.label}
				</a>
			{/each}
		</nav>
	{/if}
</header>

<style>
	@media (max-width: 768px) {
		.desktop-nav {
			display: none !important;
		}
		.mobile-toggle {
			display: flex !important;
		}
	}
</style>
