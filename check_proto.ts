import automizerModule from "pptx-automizer";
const Automizer = automizerModule.default || automizerModule;
console.log(Object.keys(Automizer.prototype));
// To check Slide properties
console.log("Check slide prototype");
