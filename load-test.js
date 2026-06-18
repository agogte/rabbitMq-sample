// load-test.js
// Ramps traffic against POST /submit from a baseline rate to 3-5x baseline
// and asserts that no requests were dropped (errors/timeouts/non-2xx).
const autocannon = require("autocannon");

const TARGET_URL = process.env.LOAD_TEST_URL || "http://localhost:3000/submit";
const BASELINE_CONNECTIONS = Number(process.env.BASELINE_CONNECTIONS || 10);
const MULTIPLIER = Number(process.env.LOAD_MULTIPLIER || 4); // within the 3-5x range
const DURATION_SECONDS = Number(process.env.LOAD_DURATION || 20);

function makeRequestBody(i) {
  return JSON.stringify({
    userId: `load-test-user-${i}`,
    taxData: `payload-${i}`,
  });
}

function runPhase({ title, connections, duration }) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${title}: ${connections} connections for ${duration}s ===`);

    const instance = autocannon(
      {
        url: TARGET_URL,
        connections,
        duration,
        method: "POST",
        headers: { "content-type": "application/json" },
        setupClient(client) {
          let i = 0;
          client.setBody(makeRequestBody(i++));
          client.on("response", () => {
            client.setBody(makeRequestBody(i++));
          });
        },
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function summarize(title, result) {
  const dropped = result.errors + result.timeouts + (result.non2xx || 0);
  console.log(`\n--- ${title} summary ---`);
  console.log(`Requests sent:      ${result.requests.sent}`);
  console.log(`2xx responses:      ${result["2xx"]}`);
  console.log(`Non-2xx responses:  ${result.non2xx || 0}`);
  console.log(`Errors:             ${result.errors}`);
  console.log(`Timeouts:           ${result.timeouts}`);
  console.log(`Throughput (req/s): ${result.requests.average}`);
  return dropped;
}

async function main() {
  const baseline = await runPhase({
    title: "Baseline",
    connections: BASELINE_CONNECTIONS,
    duration: DURATION_SECONDS,
  });
  const baselineDropped = summarize("Baseline", baseline);

  const surgeConnections = BASELINE_CONNECTIONS * MULTIPLIER;
  const surge = await runPhase({
    title: `Surge (${MULTIPLIER}x)`,
    connections: surgeConnections,
    duration: DURATION_SECONDS,
  });
  const surgeDropped = summarize(`Surge (${MULTIPLIER}x)`, surge);

  const totalDropped = baselineDropped + surgeDropped;
  console.log(`\n=== Result ===`);
  console.log(`Total dropped requests across both phases: ${totalDropped}`);

  if (totalDropped > 0) {
    console.error("FAIL: dropped requests detected under surge traffic.");
    process.exit(1);
  }

  console.log("PASS: zero dropped requests at up to " + MULTIPLIER + "x baseline traffic.");
}

main().catch((err) => {
  console.error("Load test failed to run:", err);
  process.exit(1);
});
