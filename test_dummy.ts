import fs from 'fs';
import PptxGenJS from 'pptxgenjs';

async function createDummyTemplate() {
  const pptx = new PptxGenJS();
  pptx.addSlide().addText('Base Template', { x: 1, y: 1 });
  await pptx.writeFile({ fileName: '/tmp/dummy.pptx' });
}
createDummyTemplate().catch(console.error);
