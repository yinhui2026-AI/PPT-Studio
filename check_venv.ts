import { execSync } from "child_process";
try {
  console.log(execSync("python3 -m venv venv").toString());
} catch (e: any) {
  console.error("error", e.message);
  console.error(e.stderr?.toString());
}
