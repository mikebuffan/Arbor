import { writeFileSync } from "node:fs";

const target = process.argv[2];
if (!target) throw new Error("fixture_target_required");
const stream = s => `<< /Length ${Buffer.byteLength(s, "ascii")} >>\nstream\n${s}\nendstream`;
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  stream("BT /F1 12 Tf 40 450 Td (HARMLESS SANDBOX FIXTURE) Tj ET"),
];
let data = "%PDF-1.4\n%synthetic-harmless-sandbox-fixture\n";
const offsets = [];
for (const [i, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(data, "ascii"));
  data += `${i + 1} 0 obj\n${object}\nendobj\n`;
}
const xref = Buffer.byteLength(data, "ascii");
data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets) data += `${String(offset).padStart(10, "0")} 00000 n \n`;
data += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(target, Buffer.from(data, "ascii"), { flag: "wx", mode: 0o600 });
