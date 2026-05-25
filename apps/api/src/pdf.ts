import PDFDocument from "pdfkit";
import type { QuestionPaper } from "./types.js";

const label: Record<string, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Hard",
};

export function createPaperPdf(paper: QuestionPaper): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 48, size: "A4" });

  doc.font("Helvetica-Bold").fontSize(20).text(paper.title, { align: "center" });
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).text(`${paper.subject} | ${paper.durationMinutes} min | ${paper.totalMarks} marks`, {
    align: "center",
  });
  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").fontSize(12).text("Student Information");
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(10);
  doc.text("Name: ________________________________    Roll No: __________________");
  doc.moveDown(0.5);
  doc.text("Section: ______________________________");
  doc.moveDown(1.2);

  paper.sections.forEach((section) => {
    doc.font("Helvetica-Bold").fontSize(13).text(section.title);
    doc.font("Helvetica-Oblique").fontSize(10).text(section.instruction);
    doc.moveDown(0.5);

    section.questions.forEach((question, index) => {
      doc.font("Helvetica-Bold").fontSize(10).text(`Q${index + 1}. `, { continued: true });
      doc.font("Helvetica").text(question.text);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#555")
        .text(`${label[question.difficulty]} | ${question.marks} marks`);
      doc.fillColor("#000").moveDown(0.75);
    });

    doc.moveDown(0.5);
  });

  doc.end();
  return doc;
}
