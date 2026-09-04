import fs from "node:fs";
import path from "node:path";

function collectStepKeys(steps, result) {
  for (const step of steps || []) {
    if (step?.StepRunnerKey) {
      result.add(step.StepRunnerKey);
    }
    collectStepKeys(step?.IfSteps, result);
    collectStepKeys(step?.ElseSteps, result);
  }
}

export function inspectSamples(samplesDir) {
  if (!fs.existsSync(samplesDir)) {
    return [];
  }

  return fs.readdirSync(samplesDir)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .map((name) => {
      const filePath = path.join(samplesDir, name);
      const raw = fs.readFileSync(filePath, "utf8");
      const root = JSON.parse(raw);
      const stepKeys = new Set();

      if (typeof root.Data === "string" && root.Data.startsWith("json:")) {
        return {
          name,
          title: root.Title,
          actionType: root.ActionType,
          stepKeys: ["ActionType:11"]
        };
      }

      try {
        const data = JSON.parse(root.Data);
        collectStepKeys(data.Steps, stepKeys);
      } catch {
        stepKeys.add("UNPARSED_DATA");
      }

      return {
        name,
        title: root.Title,
        actionType: root.ActionType,
        stepKeys: Array.from(stepKeys).sort()
      };
    });
}
