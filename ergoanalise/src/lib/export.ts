export function exportToDocx(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const styles = `
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
      h1 { font-size: 18pt; color: #1e293b; margin-bottom: 4pt; }
      h2 { font-size: 14pt; color: #1e293b; margin-top: 12pt; margin-bottom: 6pt; }
      h3 { font-size: 12pt; color: #334155; margin-top: 8pt; margin-bottom: 4pt; }
      table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
      th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; font-size: 10pt; }
      th { background-color: #f1f5f9; font-weight: bold; }
      .nc { background-color: #fef2f2; }
      .badge { display: inline-block; padding: 2pt 6pt; border-radius: 4pt; font-size: 9pt; font-weight: bold; }
      .badge-red { background-color: #fecaca; color: #991b1b; }
      .badge-green { background-color: #d1fae5; color: #065f46; }
      .badge-blue { background-color: #dbeafe; color: #1e40af; }
      .badge-gray { background-color: #e2e8f0; color: #475569; }
      img { max-width: 200px; max-height: 200px; }
    </style>
  `;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">${styles}</head>
    <body>${el.innerHTML}</body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
