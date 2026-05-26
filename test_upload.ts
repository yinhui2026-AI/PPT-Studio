import fs from 'fs';
import PptxGenJS from 'pptxgenjs';
import FormData from 'form-data';

async function createDummyTemplate() {
  const pptx = new PptxGenJS();
  pptx.addSlide().addText('Base Template', { x: 1, y: 1 });
  await pptx.writeFile({ fileName: '/tmp/dummy.pptx' });
}

async function run() {
  await createDummyTemplate();
  
  const form = new FormData();
  const fileBuffer = fs.readFileSync('/tmp/dummy.pptx');
  form.append('template', fileBuffer, {
    filename: 'dummy.pptx',
    knownLength: fileBuffer.length
  });
  
  console.log("Uploading template...");
  const res = await fetch('http://localhost:3000/api/upload-template', {
    method: 'POST',
    headers: form.getHeaders(),
    body: form as any
  });
  
  const dataText = await res.text();
  console.log("Upload response raw:", dataText);
  let data;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    return;
  }

  
  if (data.templateUrl) {
    console.log("Submitting outline to save-ppt...");
    const saveRes = await fetch('http://localhost:3000/api/save-ppt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'test_template',
        templateUrl: data.templateUrl,
        outline: [
          { title: 'Slide 1', bulletPoints: ['A', 'B'] },
          { title: 'Slide 2', bulletPoints: ['X', 'Y'] }
        ]
      })
    });
    const saveData = await saveRes.json();
    console.log("Save response:", saveData);
  }
}

run().catch(console.error);
