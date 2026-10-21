# Writing here

- Put essays in `content/writing/`, short notes in `content/notes/`, collections in `content/lists/`.
- Link another page with `[[notes/page-name|Readable label]]`. Quartz supplies hover previews and backlinks.
- Add `tags: [learning, software]` to frontmatter. Tags become clickable; search and folder lists are enabled.
- Use ordinary Markdown bullets or numbered lists. One short entry per paragraph is enough.
- Empty templates start with `publish: false` and `draft: true`. To publish a page, set `publish: true` and `draft: false`. A public stub can remain `stage: stub`.
- Draft flags exclude pages from the website, not from this GitHub repository. Keep sensitive writing elsewhere.

## Local build

This is the fork's Quartz v5 configuration. In a complete checkout with Node >=22 and npm >=10.9.2:

```sh
npm install
npx quartz plugin install
npx quartz build --serve
```

The site domain is still `localhost:8080`; replace it when choosing hosting. No hosting is configured by this change. Graph and Latest remain disabled. Config, Markdown metadata, and link targets were checked; the actual Quartz build/browser behavior still needs verification because this editing environment cannot resolve GitHub for Git/npm.
