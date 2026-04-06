<script lang="ts">
	let { posts = [] }: { posts: Array<{ title: string; slug: string; date: string; tags?: string[] }> } = $props();
</script>

<section style="padding: 3rem 0;">
	<h2 style="font-size: 1.5rem; font-weight: 700; color: #ffffff; margin-bottom: 2rem;">
		<span style="color: #9ca3af;">$</span>
		<span style="color: #6FC1FF;"> cat</span>
		<span> recent-posts</span>
	</h2>

	{#if posts.length > 0}
		<div class="posts-grid">
			{#each posts as post}
				<article
					class="post-card"
					style="background-color: #1f2937; border-radius: 0.75rem; padding: 1.5rem; border: 1px solid #374151; transition: all 0.2s ease;"
				>
					<a href="https://hacker1db.dev/posts/{post.slug}/" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
						<h3 style="font-size: 1.125rem; font-weight: 700; color: #ffffff; margin-bottom: 0.5rem; line-height: 1.3; transition: color 0.2s ease;">
							{post.title}
						</h3>

						<time style="font-size: 0.8rem; color: #9ca3af; display: block; margin-bottom: 0.75rem;">
							{post.date}
						</time>

						{#if post.tags && post.tags.length > 0}
							<div style="display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 1rem;">
								{#each post.tags.slice(0, 2) as tag}
									<span style="background-color: rgba(107, 114, 128, 0.3); color: #d1d5db; font-size: 0.7rem; font-weight: 500; padding: 0.2rem 0.5rem; border-radius: 0.25rem; border: 1px solid rgba(107, 114, 128, 0.2);">
										#{tag}
									</span>
								{/each}
							</div>
						{/if}

						<span style="color: #6FC1FF; font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.25rem;">
							Read <span style="font-size: 0.75rem;">&rarr;</span>
						</span>
					</a>
				</article>
			{/each}
		</div>
	{:else}
		<a
			href="https://hacker1db.dev"
			target="_blank"
			rel="noopener noreferrer"
			class="post-card"
			style="display: block; background-color: #1f2937; border-radius: 0.75rem; padding: 2rem; border: 1px solid #374151; text-decoration: none; text-align: center; transition: all 0.2s ease;"
		>
			<p style="color: #d1d5db; margin-bottom: 0.5rem;">No posts loaded.</p>
			<span style="color: #6FC1FF; font-weight: 500;">Visit the blog &rarr;</span>
		</a>
	{/if}
</section>

<style>
	.posts-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.post-card:hover {
		border-color: #6FC1FF !important;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	@media (max-width: 768px) {
		.posts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
