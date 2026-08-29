/** Throwaway: has the audit site ever been published to GitHub Pages? */
const urls = [
  'https://billy-bad-ass.github.io/sitecheck-1/audit/',
  'https://billy-bad-ass.github.io/sitecheck-1/',
  'https://billy-bad-ass.github.io/',
];
for (const url of urls) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const html = r.ok ? await r.text() : '';
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '<none>';
    console.log(`  ${r.status}  ${url}`);
    if (r.ok) {
      console.log(`        title: ${title}`);
      console.log(`        bytes: ${html.length}  stripe link: ${/buy\.stripe\.com|payment_link|plink_/i.test(html) ? 'YES' : 'no'}`);
    }
  } catch (e) {
    console.log(`  ERR  ${url} — ${e}`);
  }
}
