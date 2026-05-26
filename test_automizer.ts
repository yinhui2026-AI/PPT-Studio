import automizerModule from "pptx-automizer";
const Automizer = automizerModule.default || automizerModule;
const automizer = new Automizer({
  templateDir: ".",
  outputDir: "."
});
console.log("Automizer initialized!");
