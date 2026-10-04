<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Clerk } from '@clerk/clerk-js';

	// Extend Window to declare the internal Clerk UI constructor
	// This is an undocumented Clerk internal — typed as unknown intentionally
	declare global {
		interface Window {
			__internal_ClerkUICtor?: unknown;
		}
	}

	type ClerkInstance = InstanceType<typeof Clerk>;

	let container: HTMLDivElement;
	let error = $state('');
	let loading = $state(true);

	onMount(async () => {
		const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

		if (!publishableKey) {
			error = 'Add your VITE_CLERK_PUBLISHABLE_KEY to .env.local';
			loading = false;
			return;
		}

		try {
			const clerkDomain = atob(publishableKey.split('_')[2]).slice(0, -1);

			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
				script.async = true;
				script.crossOrigin = 'anonymous';
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('Failed to load @clerk/ui bundle'));
				document.head.appendChild(script);
			});

			const clerk = new Clerk(publishableKey);

			// ui.ClerkUI is an internal Clerk API with no public type — suppressed intentionally
			// @ts-expect-error -- __internal_ClerkUICtor is an undocumented Clerk internal
			await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

			loading = false;

			if (clerk.isSignedIn) {
				await verifyAndRedirect(clerk);
			} else {
				clerk.mountSignIn(container);

				clerk.addListener(async ({ session }) => {
					if (session) {
						await verifyAndRedirect(clerk);
					}
				});
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load authentication.';
			loading = false;
		}
	});

	async function verifyAndRedirect(clerk: ClerkInstance): Promise<void> {
		const token = await clerk.session?.getToken();
		if (!token) return;

		const res = await fetch('/api/auth/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		});

		if (res.ok) {
			goto('/admin/');
		} else {
			error = 'Authentication failed. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Login | hacker1db newsletter</title>
</svelte:head>

<section style="display: flex; justify-content: center; align-items: center; min-height: 60vh; padding: 2rem 1rem;">
	<div style="max-width: 420px; width: 100%;">
		<div style="font-family: 'JetBrains Mono', 'Fira Code', Monaco, monospace; font-size: 1rem; color: #6FC1FF; margin-bottom: 2rem; text-align: center;">
			<span style="color: #9ca3af;">$</span> sudo login --discord
		</div>

		{#if loading}
			<div style="text-align: center; color: #9ca3af; font-size: 0.875rem;">
				<span style="display: inline-block; animation: blink 1s step-end infinite; color: #6FC1FF;">▋</span>
				Loading authentication...
			</div>
		{/if}

		{#if error}
			<div style="background-color: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 0.5rem; padding: 1rem; color: #f87171; font-size: 0.875rem; margin-bottom: 1rem;">
				{error}
			</div>
		{/if}

		<!-- Clerk mounts SignIn here -->
		<div bind:this={container}></div>

		<div style="margin-top: 1.5rem; text-align: center;">
			<a
				href="/"
				style="color: #6FC1FF; text-decoration: none; font-size: 0.875rem; opacity: 0.7; transition: opacity 0.2s;"
				onmouseenter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
				onmouseleave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.7')}
			>
				&larr; Back to home
			</a>
		</div>
	</div>
</section>
