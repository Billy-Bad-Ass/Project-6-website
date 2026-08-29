/** Throwaway: which Worker is actually answering on audit.? */
for (const host of ['audit.bbanetwork.org', 'bbanetwork.org']) {
  const r = await fetch(`https://${host}/api/health`);
  const body = await r.text();
  console.log(`  ${host}/api/health → ${r.status} ${body.slice(0, 200)}`);
}
