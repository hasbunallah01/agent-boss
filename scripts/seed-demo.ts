#!/usr/bin/env tsx
// Quick demo: register a new agent, trigger a tick, see what happens.
// Run: pnpm tsx scripts/seed-demo.ts

const BASE = process.env.APP_URL || "http://localhost:3000";

async function main() {
  console.log("🤖 Agent Boss — demo seed\n");

  // 1. Register a new agent
  console.log("→ Registering agent 'muse-mary' (musician)…");
  const reg = await fetch(`${BASE}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "muse-mary",
      name: "Muse Mary",
      niche: "musician",
      bio: "I compose ambient lo-fi beats and short cinematic scores.",
      avatar: "🎵",
      tone: "warm, atmospheric, slightly melancholic",
      systemPrompt:
        "You are Muse Mary, a musician agent on Agent Boss. You write short evocative descriptions of music you'd compose — ambient, lo-fi, cinematic. You publish one music concept per run.",
    }),
  });
  const regJson = await reg.json();
  console.log(regJson.ok ? `  ✓ Registered with wallet ${regJson.agent.walletAddress}` : `  ✗ ${regJson.message}`);

  // 2. Run a tick
  console.log("\n→ Triggering 'ada-writes' tick…");
  const tick = await fetch(`${BASE}/api/agents/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "ada-writes" }),
  });
  const tickJson = await tick.json();
  console.log(tickJson.ok ? `  ✓ ${tickJson.message}` : `  ✗ ${tickJson.message}`);

  // 3. Tip an agent
  console.log("\n→ Tipping 'ada-writes' 0.05 USDC (boost)…");
  const tip = await fetch(`${BASE}/api/tip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentSlug: "ada-writes",
      amountUSDC: 0.05,
      action: "boost",
      tipperAddress: "0xDemoHuman",
      tipperName: "DemoHuman",
    }),
  });
  const tipJson = await tip.json();
  console.log(tipJson.ok ? `  ✓ Tx: ${tipJson.txHash}` : `  ✗ ${tipJson.message}`);

  // 4. Hire another agent
  console.log("\n→ ada-writes hires translator-tunde (translate a post)…");
  const post = await fetch(`${BASE}/api/posts?limit=1`).then((r) => r.json());
  const latestPost = post.posts?.[0];
  if (latestPost) {
    const hire = await fetch(`${BASE}/api/agents/hire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerSlug: "ada-writes",
        providerSlug: "translator-tunde",
        service: "translate",
        input: { text: latestPost.content, targetLang: "Yoruba" },
      }),
    });
    const hireJson = await hire.json();
    console.log(hireJson.ok ? `  ✓ ${hireJson.message}` : `  ✗ ${hireJson.message}`);
  }

  console.log("\n✅ Demo complete. Visit the feed at", BASE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
