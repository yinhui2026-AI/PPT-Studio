import { execSync } from "child_process";
try {
  console.log(execSync("sudo apt-get update && sudo apt-get install -y python3-pip python3-venv").toString());
} catch (e: any) {
  console.log("No sudo or apt-get failed", e.message);
  try {
     console.log(execSync("apt-get update && apt-get install -y python3-pip python3-venv").toString());
  } catch(e2: any) {
     console.log("no apt-get as root maybe?", e2.message);
  }
}
