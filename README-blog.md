# Blog

Alana writes at **/admin**. Each save commits a JSON file to `blog/posts/`. Cloudflare Pages then runs `npm run build`, which renders `/blog/`, `/blog/<slug>/` and `/blog/feed.xml` into `dist/`. Posts stay hidden until **Draft** is unticked.

## One-time setup

1. **GitHub:** put this folder in a GitHub repo (`git init`, commit, push).
2. **Cloudflare Pages:** connect the project to that repo. Build command `npm run build`, output directory `dist`. From then on, every push or CMS save redeploys.
3. **admin/config.yml:** set `repo: owner/name`.
4. **Login:** deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (a free Cloudflare Worker, one-click deploy). Then create a GitHub OAuth app whose callback is `https://<worker>/callback`, and put the worker URL in `base_url` in config.yml.
   Until that's in place you can still sign in to /admin with a GitHub personal access token (Contents: read/write on this repo).
5. Add Alana as a collaborator on the GitHub repo. She logs in with her own GitHub account.

## Local preview

    npm install && npm run build && python3 -m http.server -d dist 8000
