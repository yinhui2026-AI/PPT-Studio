import { execSync } from "child_process";
try {
  execSync("python3 -m venv .venv");
  execSync(".venv/bin/pip install python-pptx --quiet");
  console.log(execSync(".venv/bin/python -c 'import pptx; print(\"yes\")'").toString());
} catch (e: any) {
  console.error("error", e.message);
}
