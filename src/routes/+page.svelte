<script lang="ts">
	import Hero from '$components/Hero.svelte';
	import SubscribeForm from '$components/SubscribeForm.svelte';
	import RecentPosts from '$components/RecentPosts.svelte';
	import SocialLinks from '$components/SocialLinks.svelte';

	let { data }: { data: { posts: Array<{ title: string; slug: string; date: string; tags?: string[] }>; subscriberCount: number } } = $props();
</script>

<svelte:head>
	<title>hacker1db newsletter</title>
	<meta name="description" content="Security posts, dev notes, hacker stuff — delivered to your inbox." />
</svelte:head>

<Hero subscriberCount={data.subscriberCount}>
	<SubscribeForm />
</Hero>

<RecentPosts posts={data.posts} />

<SocialLinks />
