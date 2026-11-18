// Builds the site into dist/: copies the static files as-is, then renders
// blog/posts/*.json (written by the /admin editor) into /blog/ and /blog/<slug>/.
// Cloudflare Pages: build command `npm run build`, output directory `dist`.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const OUT = 'dist';
const SKIP = new Set([OUT, 'node_modules', 'build.mjs', 'package.json', 'package-lock.json',
  '.gitignore', '.git', '.DS_Store', 'set-domain.sh', 'README-blog.md']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of fs.readdirSync('.')) {
  if (!SKIP.has(f)) fs.cpSync(f, path.join(OUT, f), { recursive: true });
}
fs.rmSync(path.join(OUT, 'blog/posts'), { recursive: true, force: true });

// ponytail: nav, footer and tracking are lifted from an existing page so they never drift.
const src = fs.readFileSync('residents/index.html', 'utf8');
const grab = (re) => { const m = src.match(re); if (!m) throw new Error(`build: ${re} not found in residents/index.html`); return m[0]; };
const tracking = grab(/<!-- Google tag[\s\S]*?<!-- End Meta Pixel Code -->/);
const nav = grab(/<nav>[\s\S]*?<\/nav>/);
const footer = grab(/<footer>[\s\S]*?<\/footer>/);
const site = 'https://' + fs.readFileSync('index.html', 'utf8').match(/rel="canonical" href="https:\/\/([^/"]+)/)[1];

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

const page = ({ title, description, url, image, type, body, jsonld }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Alana Kayfetz">
<link rel="canonical" href="${url}">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Alana Kayfetz">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="en_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
<link rel="alternate" type="application/rss+xml" title="Alana Kayfetz blog" href="/blog/feed.xml">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
<link rel="stylesheet" href="/css/site.css">
<script src="https://f.convertkit.com/ckjs/ck.5.js" defer></script>
${tracking}
</head>
<body>
${nav}
${body}
${footer}
</body>
</html>
`;

const abs = (img) => (img ? site + img : `${site}/img/og-card.jpg`);
const posts = fs.readdirSync('blog/posts')
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ slug: f.slice(0, -5), ...JSON.parse(fs.readFileSync(path.join('blog/posts', f), 'utf8')) }))
  .filter((p) => !p.draft)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

for (const p of posts) {
  const url = `${site}/blog/${p.slug}/`;
  const dir = path.join(OUT, 'blog', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page({
    title: `${p.title} | Alana Kayfetz`, description: p.description, url, image: abs(p.image), type: 'article',
    jsonld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description,
      datePublished: p.date, image: abs(p.image), url, author: { '@type': 'Person', name: 'Alana Kayfetz', url: site + '/' } },
    body: `<article class="res-hero post">
  <div class="wrap">
    <a href="/blog/" class="back">← All posts</a>
    <p class="post-date">${fmtDate(p.date)}</p>
    <h1>${esc(p.title)}</h1>
    ${p.image ? `<img class="post-cover" src="${esc(p.image)}" alt="">` : ''}
    <div class="post-body">${marked.parse(p.body || '')}</div>
  </div>
</article>`,
  }));
}

fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'blog/index.html'), page({
  title: 'Blog | Alana Kayfetz', description: 'Founder stories, Mom Halo notes and what Alana is working on.',
  url: `${site}/blog/`, image: abs(), type: 'website',
  jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Alana Kayfetz blog', url: `${site}/blog/` },
  body: `<section class="sec">
  <div class="wrap">
    <p class="sec-label">The blog</p>
    <h2>Notes from <em>Alana.</em></h2>
    <div class="post-list">
${posts.map((p) => `      <a class="bcard" href="/blog/${p.slug}/">
        ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}
        <p class="post-date">${fmtDate(p.date)}</p>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
      </a>`).join('\n') || '      <p class="sec-intro">First post coming soon.</p>'}
    </div>
  </div>
</section>`,
}));

fs.writeFileSync(path.join(OUT, 'blog/feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Alana Kayfetz</title><link>${site}/blog/</link><description>Notes from Alana.</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${site}/blog/${p.slug}/</link><guid>${site}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>
`);

// Add blog URLs to the sitemap that set-domain.sh writes, if there is one.
const sm = path.join(OUT, 'sitemap.xml');
if (fs.existsSync(sm)) {
  const urls = [`${site}/blog/`, ...posts.map((p) => `${site}/blog/${p.slug}/`)]
    .map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', `${urls}\n</urlset>`));
}

console.log(`built ${posts.length} post(s) into ${OUT}/`);
