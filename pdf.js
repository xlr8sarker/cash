/* ==========================================================================
   SARKER STUDIO — PDF & PRINT ENGINE
   Builds the pixel-accurate Cash Memo / Due Receipt markup and exports it
   to high-resolution (300 DPI) A4 PDF using html2canvas + jsPDF, or sends
   it straight to the browser print dialog.
   ========================================================================== */

const COMPANY = {
  name: "SARKER STUDIO",
  tagline: "DESIGN. DEVELOP. DIGITALIZE.",
  location: "Dhaka, Bangladesh",
  phone: "+8801604306543",
  email: "sarkerr.studio@gmail.com",
  logo: "assets/logo.jpg",
};

const PAYMENT_METHOD_LIST = ["Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Card", "Other"];

function money(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "____/____/______";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ---------------------------- SHARED HEADER / FOOTER ---------------------------- */

function memoHeaderHTML(memo, badgeText, badgeClass) {
  return `
    <div class="memo-header">
      <div class="memo-header-left">
        <img class="memo-logo" src="${COMPANY.logo}" alt="Sarker Studio Logo" />
        <div class="memo-brand-text">
          <div class="memo-company-name">SARKER <span class="accent">STUDIO</span></div>
          <div class="memo-tagline">DESIGN. DEVELOP. <span class="accent">DIGITALIZE.</span></div>
          <div class="memo-contact-list">
            <div class="memo-contact-row"><span class="ci">&#128205;</span>${COMPANY.location}</div>
            <div class="memo-contact-row"><span class="ci">&#128222;</span>${COMPANY.phone}</div>
            <div class="memo-contact-row"><span class="ci">&#9993;</span>${COMPANY.email}</div>
          </div>
        </div>
      </div>
      <div class="memo-header-right">
        <div class="memo-type-badge ${badgeClass || ""}">${badgeText}</div>
        <div class="memo-meta">
          <div class="memo-meta-row"><span class="mm-label">Memo No.</span><span class="mm-value">${memo.memoNo || ""}</span></div>
          <div class="memo-meta-row"><span class="mm-label">Date</span><span class="mm-value">${formatDate(memo.date)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function memoFooterHTML() {
  return `
    <div class="memo-footer">
      <div class="thank-you">
        <span class="diamond-line left"></span>
        <span>Thank you for choosing Sarker Studio.</span>
        <span class="diamond-line right"></span>
      </div>
      <div class="brand-strip">DESIGN &nbsp;&bull;&nbsp; DEVELOP &nbsp;&bull;&nbsp; DIGITALIZE</div>
    </div>
  `;
}

/* ---------------------------- CASH MEMO TEMPLATE ---------------------------- */

function buildMemoHTML(memo) {
  const c = memo.customer || {};

  const infoGrid = `
    <div class="memo-info-grid">
      <div class="memo-info-row"><span class="ir-label">Customer Name</span><span class="ir-value">${c.name || ""}</span></div>
      <div class="memo-info-row"><span class="ir-label">Email</span><span class="ir-value">${c.email || ""}</span></div>
      <div class="memo-info-row"><span class="ir-label">Company Name</span><span class="ir-value">${c.company || ""}</span></div>
      <div class="memo-info-row"><span class="ir-label">Address</span><span class="ir-value">${c.address || ""}</span></div>
      <div class="memo-info-row"><span class="ir-label">Phone Number</span><span class="ir-value">${c.phone || ""}</span></div>
    </div>
  `;

  const services = memo.services || [];
  const rowsHTML = services
    .map(
      (s, i) => `
      <tr>
        <td class="mc-no">${i + 1}</td>
        <td>${s.name || ""}</td>
        <td class="mc-qty">${s.qty || 0}</td>
        <td class="mc-price">৳${money(s.unitPrice)}</td>
        <td class="mc-total">৳${money(s.total)}</td>
      </tr>`
    )
    .join("");
  // pad up to 6 visual rows minimum so the table doesn't look empty
  const padCount = Math.max(0, 6 - services.length);
  const padRows = Array.from({ length: padCount })
    .map(
      (_, i) => `
      <tr class="empty-row">
        <td class="mc-no">${services.length + i + 1}</td>
        <td>&nbsp;</td><td class="mc-qty">&nbsp;</td><td class="mc-price">&nbsp;</td><td class="mc-total">&nbsp;</td>
      </tr>`
    )
    .join("");

  const serviceTable = `
    <table class="memo-service-table">
      <thead>
        <tr>
          <th class="mc-no">No.</th>
          <th>Description</th>
          <th class="mc-qty">Qty</th>
          <th class="mc-price">Unit Price (৳)</th>
          <th class="mc-total">Total (৳)</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}${padRows}</tbody>
    </table>
  `;

  const checkboxGrid = PAYMENT_METHOD_LIST.map((pm) => {
    const isChecked = memo.paymentMethod === pm;
    const label = pm === "Other" && isChecked && memo.paymentOther ? `Other: ${memo.paymentOther}` : pm;
    return `
      <div class="memo-checkbox-item ${isChecked ? "checked" : ""}">
        <span class="cb-box">${isChecked ? "&#10003;" : ""}</span>
        <span>${label}</span>
      </div>`;
  }).join("");

  const notesLines = [];
  const noteText = (memo.notes || "").trim();
  const noteChunks = noteText ? noteText.match(/.{1,58}(\s|$)/g) || [noteText] : [];
  for (let i = 0; i < 3; i++) {
    notesLines.push(`<div class="memo-notes-line">${noteChunks[i] ? noteChunks[i].trim() : ""}</div>`);
  }

  const totalsBox = `
    <div class="memo-totals-box">
      <div class="memo-totals-row"><span class="tr-label">Subtotal</span><span class="tr-value">৳${money(memo.subtotal)}</span></div>
      <div class="memo-totals-row"><span class="tr-label">Discount</span><span class="tr-value">৳${money(memo.discountAmount)}</span></div>
      <div class="memo-totals-row"><span class="tr-label">Advance Paid</span><span class="tr-value">৳${money(memo.advancePaid)}</span></div>
      <div class="memo-totals-row"><span class="tr-label">Due</span><span class="tr-value">৳${money(memo.due)}</span></div>
      <div class="memo-totals-row grand"><span class="tr-label">GRAND TOTAL</span><span class="tr-value">৳${money(memo.grandTotal)}</span></div>
    </div>
  `;

  return `
    <div class="memo-page">
      ${memoHeaderHTML(memo, "CASH MEMO")}

      <div class="memo-section">
        <div class="memo-section-title"><span class="st-icon">&#128100;</span>Customer Information</div>
        ${infoGrid}
      </div>

      <div class="memo-section">
        <div class="memo-section-title"><span class="st-icon">&#128203;</span>Service Details</div>
        ${serviceTable}
      </div>

      <div class="memo-bottom-grid">
        <div>
          <div class="memo-section-title"><span class="st-icon">&#128179;</span>Payment Method</div>
          <div class="memo-checkbox-grid">${checkboxGrid}</div>
          <div class="memo-section-title"><span class="st-icon">&#128221;</span>Notes</div>
          <div class="memo-notes-lines">${notesLines.join("")}</div>
        </div>
        <div>
          <div class="memo-section-title"><span class="st-icon">&#8721;</span>Totals</div>
          ${totalsBox}
        </div>
      </div>

      <div class="memo-signature-row">
        <div class="memo-sign-col">
          <div class="sign-label">Prepared By</div>
          <div class="sign-line"></div>
        </div>
        <div class="memo-sign-col">
          <div class="sign-label">Authorized Signature</div>
          <div class="sign-line"></div>
        </div>
      </div>

      ${memoFooterHTML()}
    </div>
  `;
}

/* ---------------------------- DUE RECEIPT TEMPLATE ---------------------------- */

function buildDueReceiptHTML(memo) {
  const c = memo.customer || {};
  const paymentLabel =
    memo.paymentMethod === "Other" && memo.paymentOther ? `Other: ${memo.paymentOther}` : memo.paymentMethod || "";

  return `
    <div class="memo-page">
      ${memoHeaderHTML(memo, "DUE RECEIPT", "due-title-badge")}

      <div class="memo-section">
        <div class="memo-section-title"><span class="st-icon">&#128100;</span>Customer Information</div>
        <div class="memo-info-grid">
          <div class="memo-info-row"><span class="ir-label">Customer Name</span><span class="ir-value">${c.name || ""}</span></div>
          <div class="memo-info-row"><span class="ir-label">Memo Number</span><span class="ir-value">${memo.memoNo || ""}</span></div>
          <div class="memo-info-row"><span class="ir-label">Company Name</span><span class="ir-value">${c.company || ""}</span></div>
          <div class="memo-info-row"><span class="ir-label">Date</span><span class="ir-value">${formatDate(memo.date)}</span></div>
        </div>
      </div>

      <div class="memo-section">
        <div class="memo-section-title"><span class="st-icon">&#128179;</span>Payment Summary</div>
        <div class="due-info-box">
          <div class="due-info-row"><span class="di-label">Grand Total</span><span class="di-value">৳${money(memo.grandTotal)}</span></div>
          <div class="due-info-row"><span class="di-label">Advance Paid</span><span class="di-value">৳${money(memo.advancePaid)}</span></div>
          <div class="due-info-row"><span class="di-label">Payment Method</span><span class="di-value">${paymentLabel}</span></div>
          <div class="due-info-row due-highlight"><span class="di-label">Remaining Due</span><span class="di-value">৳${money(memo.due)}</span></div>
        </div>
      </div>

      <div class="memo-section">
        <div class="memo-section-title"><span class="st-icon">&#128221;</span>Notes</div>
        <div class="memo-notes-lines">
          <div class="memo-notes-line">${(memo.notes || "").slice(0, 58)}</div>
          <div class="memo-notes-line"></div>
        </div>
      </div>

      <div class="memo-signature-row">
        <div class="memo-sign-col">
          <div class="sign-label">Prepared By</div>
          <div class="sign-line"></div>
        </div>
        <div class="memo-sign-col">
          <div class="sign-label">Authorized Signature</div>
          <div class="sign-line"></div>
        </div>
      </div>

      ${memoFooterHTML()}
    </div>
  `;
}

/* ---------------------------- RENDER / CAPTURE HELPERS ---------------------------- */

/**
 * Render the given HTML into the offscreen #printRoot and return the element.
 */
function mountToPrintRoot(html) {
  const root = document.getElementById("printRoot");
  root.innerHTML = html;
  return root.firstElementChild;
}

/**
 * Capture a mounted memo-page element to a high-res canvas (~300 DPI).
 */
async function captureElementToCanvas(el) {
  const SCALE = 3.125; // 794px * 3.125 ≈ 2481px ≈ 300dpi for A4 width
  return await html2canvas(el, {
    scale: SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
}

/**
 * Generate a jsPDF document (A4 portrait) from a canvas, fitted to the page.
 */
function canvasToPDF(canvas) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const ratio = canvas.height / canvas.width;
  let renderWidth = pageWidth;
  let renderHeight = pageWidth * ratio;
  if (renderHeight > pageHeight) {
    renderHeight = pageHeight;
    renderWidth = pageHeight / ratio;
  }
  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;
  pdf.addImage(imgData, "JPEG", x, y, renderWidth, renderHeight, undefined, "FAST");
  return pdf;
}

async function exportMemoAsPDF(memo, type = "memo") {
  const html = type === "due" ? buildDueReceiptHTML(memo) : buildMemoHTML(memo);
  const el = mountToPrintRoot(html);
  await waitForImages(el);
  const canvas = await captureElementToCanvas(el);
  const pdf = canvasToPDF(canvas);
  const suffix = type === "due" ? "Due-Receipt" : "Cash-Memo";
  pdf.save(`${suffix}-${memo.memoNo || "SS"}.pdf`);
  document.getElementById("printRoot").innerHTML = "";
}

async function printMemo(memo, type = "memo") {
  const html = type === "due" ? buildDueReceiptHTML(memo) : buildMemoHTML(memo);
  const cssHref = "print-template.css";
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    showToast("Please allow pop-ups to print.", "error");
    return;
  }
  // A4 @ 96dpi reference (matches print-template.css's .memo-page width of 794px)
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${type === "due" ? "Due Receipt" : "Cash Memo"} - ${memo.memoNo || ""}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="${cssHref}" />
        <style>
          html, body { margin:0; padding:0; background:#fff; }
          .print-page-frame {
            width: ${A4_WIDTH_PX}px;
            margin: 20px auto;
          }
          @media print {
            @page { size: A4 portrait; margin: 0; }
            html, body { width: 210mm; height: 297mm; }
            .print-page-frame {
              width: 210mm;
              height: 297mm;
              margin: 0;
              overflow: hidden;
              position: relative;
            }
            .memo-page {
              position: absolute;
              top: 0;
              left: 50%;
              transform-origin: top center;
            }
            .memo-page { border-radius:0; border:none; margin:0; box-shadow:none; }
          }
        </style>
      </head>
      <body><div class="print-page-frame">${html}</div></body>
    </html>
  `);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      // Shrink the memo to fit exactly one A4 page height if content overflows
      // (varies with number of services and notes length).
      const el = win.document.querySelector(".memo-page");
      if (el) {
        const naturalHeight = el.offsetHeight;
        const scale = naturalHeight > A4_HEIGHT_PX ? A4_HEIGHT_PX / naturalHeight : 1;
        el.style.transform = `translateX(-50%) scale(${scale})`;
      }
      win.focus();
      win.print();
    }, 400);
  };
}

/**
 * Ensure all <img> inside an element are fully loaded before capture.
 */
function waitForImages(el) {
  const imgs = Array.from(el.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  );
}
