import { execSync } from "child_process";
try {
  console.log(execSync("npm info pptx-automizer --json").toString());
} catch (e: any) {
  console.error("error", e.message);
}
