import { execSync } from "child_process";
try {
  console.log(execSync("npm info node-pptx readme").toString().substring(0, 500));
} catch (e: any) {
  console.error("error", e.message);
}
