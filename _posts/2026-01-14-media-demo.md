---
layout: single
title: "Media demo: image + YouTube"
description: "Small example showing how to add images and an embedded video."
categories: [blog]
tags: [media, demo]
author_profile: true
---

Here’s a quick demo of adding media to a post.

## Image

Inline Markdown image:

![A calm landscape](/assets/img/media-demo.jpg)

Or using the `figure` include (adds optional caption):

{% include figure.html path="/assets/img/media-demo.jpg" title="Sample caption" %}

## YouTube embed

Use the responsive `iframe` pattern:

<div class="video-container">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allowfullscreen></iframe>
</div>

Replace the URL with your video’s `https://www.youtube.com/embed/<id>`.
