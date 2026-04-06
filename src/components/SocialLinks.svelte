<script lang="ts">
	import { siteConfig } from '$lib/config';

	const links = [
		{
			name: 'GitHub',
			url: siteConfig.social.github,
			path: 'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z'
		},
		{
			name: 'YouTube',
			url: siteConfig.social.youtube,
			path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'
		},
		{
			name: 'Twitch',
			url: siteConfig.social.twitch,
			path: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z'
		},
		{
			name: 'Twitter/X',
			url: siteConfig.social.twitter,
			path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
		},
		{
			name: 'Blog',
			url: siteConfig.social.blog,
			path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'
		}
	];
</script>

<section style="padding: 2rem 0;">
	<div style="display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;">
		{#each links as link}
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				title={link.name}
				class="social-pill"
				style="display: inline-flex; align-items: center; gap: 0.5rem; background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 0.625rem 1rem; color: #d1d5db; text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: all 0.2s ease;"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
					<path d={link.path} />
				</svg>
				{link.name}
			</a>
		{/each}
	</div>
</section>

<style>
	.social-pill:hover {
		border-color: #6FC1FF !important;
		color: #6FC1FF !important;
		box-shadow: 0 0 12px rgba(111, 193, 255, 0.15);
	}
</style>
