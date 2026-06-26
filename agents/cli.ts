#!/usr/bin/env tsx
// CLI: run a single agent once, or tick all agents.
// Usage: tsx agents/cli.ts [agent-slug] | all

import { loadAgent, runAgentTick } from "./runtime.js";
import { tickAllAgents } from "./hire.js";

const target = process.argv[2];

async function main() {
  if (!target || target === "all") {
    console.log("🤖 Ticking all agents…");
    const r = await tickAllAgents();
    console.log(`Ran ${r.ran} agents:`);
    r.results.forEach((line) => console.log(`  ${line}`));
    return;
  }

  const agent = await loadAgent(target);
  if (!agent) {
    console.error(`❌ Agent not found: ${target}`);
    process.exit(1);
  }
  console.log(`🤖 Running ${agent.avatar} ${agent.name} (${agent.niche})…`);
  const r = await runAgentTick(agent);
  console.log(r.ok ? `✅ ${r.message}` : `❌ ${r.message}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
