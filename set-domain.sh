#!/bin/sh
# Point the site at a domain. Rewrites canonical, OG tags, every JSON-LD @id,
# sitemap.xml and robots.txt in one shot.
#
#   ./set-domain.sh alana-kayfetz.pages.dev    # staging: blocks crawlers
#   ./set-domain.sh alanakayfetz.com           # launch:  opens crawlers
#
# *.pages.dev hosts get "Disallow: /" so the preview never competes with the
# real domain in search. Any other host gets a normal allow + sitemap.

set -eu
[ $# -eq 1 ] || { echo "usage: $0 <domain, no scheme>" >&2; exit 1; }
NEW="$1"
case "$NEW" in *://*) echo "give a bare domain, no https://" >&2; exit 1;; esac

OLD=$(grep -o 'rel="canonical" href="https://[^/"]*' index.html | sed 's|.*https://||')
[ -n "$OLD" ] || { echo "couldn't find current domain in index.html" >&2; exit 1; }

if [ "$OLD" = "$NEW" ]; then
  echo "already set to $NEW"
else
  # macOS and GNU sed both accept -i with an explicit backup suffix
  find . -name '*.html' -not -path './node_modules/*' -print0 \
    | xargs -0 sed -i.bak "s|https://$OLD|https://$NEW|g"
  find . -name '*.html.bak' -delete
  echo "$OLD -> $NEW across $(find . -name '*.html' | wc -l | tr -d ' ') html files"
fi

TODAY=$(date +%Y-%m-%d)
cat > sitemap.xml <<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://$NEW/</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>https://$NEW/brands/</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://$NEW/residents/</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://$NEW/residents/breathe-therapy</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://$NEW/residents/marsha-care</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://$NEW/residents/ruth-rumack</loc><lastmod>$TODAY</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>
XML

case "$NEW" in
  *.pages.dev)
    cat > robots.txt <<TXT
# Staging on Cloudflare Pages - not the live domain yet.
# Run ./set-domain.sh <real-domain> at launch to open this up.
User-agent: *
Disallow: /
TXT
    echo "robots.txt: crawlers BLOCKED (staging host)"
    ;;
  *)
    cat > robots.txt <<TXT
User-agent: *
Allow: /

Sitemap: https://$NEW/sitemap.xml
TXT
    echo "robots.txt: crawlers ALLOWED"
    ;;
esac
echo "sitemap.xml: 4 URLs on https://$NEW (lastmod $TODAY)"
