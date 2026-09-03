/** Throwaway: what answers on every host in the zone, and what is it serving? */
const hosts = [
  'bbanetwork.org',
  'www.bbanetwork.org',
  'audit.bbanetwork.org',
  'guides.bbanetwork.org',
  'heartbeat.bbanetwork.org',
];

for (const host of hosts) {
  try {
    const r = await fetch(`https://${host}/`, { redirect: 'manual' });
    const loc = r.headers.get('location');
    let title = '';
    if (r.status >= 200 && r.status < 300) {
      const html = await r.text();
      title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '';
    }
    console.log(
      `  ${host.padEnd(26)} ${String(r.status).padEnd(4)}` +
        `${r.headers.get('x-served-by') ? `[${r.headers.get('x-served-by')}] ` : ''}` +
        `${loc ? `→ ${loc} ` : ''}${title}`,
    );
  } catch (e) {
    console.log(`  ${host.padEnd(26)} 0    ${e}`);
  }
}
