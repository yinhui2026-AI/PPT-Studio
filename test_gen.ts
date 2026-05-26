import automizerModule from "pptx-automizer";
const Automizer = automizerModule.default || automizerModule;
import PptxGenJS from "pptxgenjs";

async function test() {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  await pptx.writeFile({ fileName: "template.pptx" });

  const automizer = new Automizer({
    templateDir: ".",
    outputDir: ".",
    removeExistingSlides: true,
    cleanupPlaceholders: true
  });
  const pres = automizer.loadRoot("template.pptx");
  automizer.load("template.pptx", "tmpl");
  
  const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  pres.addSlide("tmpl", 1, (slide) => {
    slide.generate((genSlide) => {
        genSlide.addImage({ data: base64, x: 1, y: 1, w: 1, h: 1 });
    });
  });

  await pres.write("output.pptx");
  console.log("Done");
}
test().catch(console.error);
