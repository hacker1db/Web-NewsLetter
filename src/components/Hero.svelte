<script lang="ts">
	import type { Snippet } from 'svelte';

	let { subscriberCount = 0, children }: { subscriberCount?: number; children?: Snippet } = $props();
</script>

<section class="hero-section" style="position: relative; overflow: hidden; padding: 4rem 0;">
	<!-- Scanline overlay -->
	<div class="scanlines"></div>

	<div style="position: relative; z-index: 1; text-align: center; max-width: 640px; margin: 0 auto; padding: 0 1rem;">
		<!-- Terminal heading -->
		<div style="margin-bottom: 1.5rem;">
			<h1 style="font-family: Monaco, Menlo, 'Courier New', monospace; font-size: 1.75rem; font-weight: 700; color: #ffffff; line-height: 1.3;">
				<span style="color: #9ca3af;">$</span>
				<span style="color: #6FC1FF;"> subscribe --to hacker1db</span>
				<span class="cursor-blink" style="color: #6FC1FF;">&#9611;</span>
			</h1>
		</div>

		<!-- Tagline -->
		<p style="color: #d1d5db; font-size: 1.125rem; line-height: 1.6; margin-bottom: 2rem;">
			Security posts, dev notes, hacker stuff delivered to your inbox.
		</p>

		<!-- Subscriber count badge -->
		{#if subscriberCount >= 10}
			<div style="margin-bottom: 1.5rem;">
				<span style="display: inline-flex; align-items: center; gap: 0.5rem; background-color: rgba(111, 193, 255, 0.1); border: 1px solid rgba(111, 193, 255, 0.25); color: #6FC1FF; font-size: 0.875rem; font-weight: 500; padding: 0.375rem 1rem; border-radius: 9999px;">
					Join {subscriberCount} readers
				</span>
			</div>
		{/if}

		<!-- Subscribe form slot -->
		{#if children}
			{@render children()}
		{/if}

		<!-- Privacy note -->
		<p style="color: #9ca3af; font-size: 0.8rem; margin-top: 1rem;">
			&#10003; No spam. Unsubscribe anytime.
		</p>
	</div>
</section>

<style>
	.scanlines {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(111, 193, 255, 0.015) 2px,
			rgba(111, 193, 255, 0.015) 4px
		);
		pointer-events: none;
		z-index: 0;
	}

	.cursor-blink {
		animation: blink 1s infinite;
	}

	@keyframes blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0; }
	}
</style>
