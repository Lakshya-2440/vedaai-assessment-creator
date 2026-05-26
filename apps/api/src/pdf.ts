import PDFDocument from "pdfkit";
import type { QuestionPaper } from "./types.js";

const difficultyLabels: Record<string, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
};

export function createPaperPdf(paper: QuestionPaper): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 48, size: "A4" });

  doc.font("Helvetica-Bold").fontSize(18).text("Delhi Public School, Sector-4, Bokaro", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(12).text(`Subject: ${paper.subject}`, { align: "center" });
  doc.text("Class: 5th", { align: "center" });
  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Time Allowed: ${paper.durationMinutes} minutes`, 48, doc.y, { continued: true });
  doc.text(`Maximum Marks: ${paper.totalMarks}`, { align: "right" });
  doc.moveDown(1);
  
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("All questions are compulsory unless stated otherwise.", 48, doc.y);
  doc.moveDown(1.2);

  doc.font("Helvetica").fontSize(10);
  doc.text("Name: ________________________________");
  doc.moveDown(0.5);
  doc.text("Roll Number: ________________________________");
  doc.moveDown(0.5);
  doc.text("Class: 5th Section: ____________________");
  doc.moveDown(1.5);

  paper.sections.forEach((section, sectionIndex) => {
    const parts = section.title.split(" - ");
    const sectionLabel = parts[0] || `Section ${String.fromCharCode(65 + sectionIndex)}`;
    const sectionName = parts.length > 1 ? parts.slice(1).join(" - ") : "";

    doc.font("Helvetica-Bold").fontSize(13).text(sectionLabel, { align: "center" });
    doc.moveDown(0.5);
    
    if (sectionName) {
      doc.font("Helvetica-Bold").fontSize(11).text(sectionName, { align: "left" });
    }
    doc.font("Helvetica-Oblique").fontSize(9).text(section.instruction, { align: "left" });
    doc.moveDown(0.8);

    section.questions.forEach((question, index) => {
      const difficultyStr = difficultyLabels[question.difficulty] || "Moderate";
      doc.font("Helvetica").fontSize(10);
      doc.text(`${index + 1}. [${difficultyStr}] ${question.text} [${question.marks} Marks]`);
      
      if (question.type === "mcq" && question.options && question.options.length === 4) {
        const clean = (s: string) => s.replace(/^[A-Da-d][).:\-]\s*/, "");
        doc.moveDown(0.3);
        doc.text(`    A. ${clean(question.options[0])}`);
        doc.text(`    B. ${clean(question.options[1])}`);
        doc.text(`    C. ${clean(question.options[2])}`);
        doc.text(`    D. ${clean(question.options[3])}`);
      }
      
      doc.moveDown(0.8);
    });
  });

  doc.font("Helvetica-Bold").fontSize(10).text("End of Question Paper");
  
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(14).text("Answer Key:");
  doc.moveDown(1);
  
  doc.font("Helvetica").fontSize(10);
  paper.sections.flatMap(s => s.questions).forEach((question, index) => {
    doc.font("Helvetica-Bold").text(`${index + 1}. `, { continued: true });
    doc.font("Helvetica").text(question.answer || "Answer not generated.");
    doc.moveDown(0.5);
  });

  doc.end();
  return doc;
}
