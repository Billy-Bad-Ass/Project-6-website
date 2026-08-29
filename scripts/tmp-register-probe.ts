/** Throwaway: is the audit host serving the real sales page, or a placeholder? */
const res = await fetch('https://audit.bbanetwork.org/', { redirect: 'follow' });
const html = await res.text();
console.log(`  status      ${res.status}`);
console.log(`  server      ${res.headers.get('server') ?? '<none>'}`);
console.log(`  bytes       ${html.length}`);
console.log(`  title       ${/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '<none>'}`);
const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, '').trim();
console.log(`  h1          ${h1 ?? '<none>'}`);
console.log(`  buy link    ${/buy\.stripe\.com|payment_link|plink_/i.test(html) ? 'YES — a Stripe link is on the page' : 'no Stripe link found'}`);
console.log(`  price shown ${/\$\s?\d/.test(html) ? (html.match(/\$\s?\d[\d,.]*/g) ?? []).slice(0, 4).join(' ') : '<none>'}`);
for (const p of ['/legal', '/legal.html', '/thanks.html']) {
  const r = await fetch(`https://audit.bbanetwork.org${p}`, { redirect: 'manual' });
  console.log(`  ${p} → ${r.status}`);
}
