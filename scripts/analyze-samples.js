import fs from "node:fs";
import path from "node:path";

const samplesDir = process.argv[2] || "D:\\Users\\Desktop\\动作导出\\actions";
const limit = Number(process.argv[3] || 80);

function addCount(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function shortValue(value) {
  if (value == null) return null;
  const text = String(value);
  return text.length <= 80 ? text : null;
}

function collectValue(map, key, value) {
  const short = shortValue(value);
  if (short == null) return;
  const values = map.get(key) || new Map();
  addCount(values, short);
  map.set(key, values);
}

function walkSteps(steps, catalog) {
  for (const step of steps || []) {
    if (!step?.StepRunnerKey) continue;
    addCount(catalog.counts, step.StepRunnerKey);

    const detail = catalog.details.get(step.StepRunnerKey) || {
      inputNames: new Map(),
      outputNames: new Map(),
      inputValues: new Map(),
      outputValues: new Map()
    };

    for (const [key, raw] of Object.entries(step.InputParams || {})) {
      addCount(detail.inputNames, key);
      const value = raw && typeof raw === "object" ? raw.Value : raw;
      collectValue(detail.inputValues, key, value);
    }

    for (const [key, value] of Object.entries(step.OutputParams || {})) {
      addCount(detail.outputNames, key);
      collectValue(detail.outputValues, key, value);
    }

    catalog.details.set(step.StepRunnerKey, detail);
    walkSteps(step.IfSteps, catalog);
    walkSteps(step.ElseSteps, catalog);
  }
}

function topEntries(map, count = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
}

function formatValues(values, count = 5) {
  return topEntries(values || new Map(), count)
    .map(([value, n]) => `${JSON.stringify(value)}:${n}`)
    .join(" | ");
}

const catalog = {
  counts: new Map(),
  details: new Map()
};

let files = 0;
for (const name of fs.readdirSync(samplesDir).filter((item) => item.toLowerCase().endsWith(".json"))) {
  try {
    const root = JSON.parse(fs.readFileSync(path.join(samplesDir, name), "utf8"));
    if (typeof root.Data !== "string" || root.Data.startsWith("json:")) {
      continue;
    }
    const data = JSON.parse(root.Data);
    walkSteps(data.Steps, catalog);
    files += 1;
  } catch {
    // ignore broken exports
  }
}

console.log(`files=${files}`);
for (const [key, count] of topEntries(catalog.counts, limit)) {
  const detail = catalog.details.get(key);
  console.log(`\n${key}\t${count}`);
  console.log(`  inputs: ${topEntries(detail.inputNames).map(([name, n]) => `${name}:${n}`).join(", ")}`);
  for (const [name] of topEntries(detail.inputNames, 6)) {
    console.log(`    ${name}: ${formatValues(detail.inputValues.get(name))}`);
  }
  console.log(`  outputs: ${topEntries(detail.outputNames).map(([name, n]) => `${name}:${n}`).join(", ")}`);
}
