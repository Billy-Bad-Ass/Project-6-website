/** Throwaway: is audit.bbanetwork.org serving the audit site or the hub? */
const r = await fetch('https://audit.bbanetwork.org/');
const html = await r.text();
console.log(`  status      ${r.status}`);
console.log(`  served-by   ${r.headers.get('x-served-by') ?? '<none>'}`);
console.log(`  title       ${/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '<none>'}`);
console.log(`  buy link    ${/buy\.stripe\.com/i.test(html) ? 'YES' : 'no'}`);
console.log(`  hub page?   ${/One network\. Separate businesses\./.test(html) ? 'YES — STILL THE HUB' : 'no'}`);
for (const p of ['/legal.html', '/assets/report-preview.png']) {
  const x = await fetch(`https://audit.bbanetwork.org${p}`);
  console.log(`  ${p} → ${x.status} ${x.headers.get('content-type') ?? ''}`);
}
const apex = await fetch('https://bbanetwork.org/');
console.log(`  apex intact ${/One network\. Separate businesses\./.test(await apex.text()) ? 'YES' : 'NO — BROKEN'}`);
