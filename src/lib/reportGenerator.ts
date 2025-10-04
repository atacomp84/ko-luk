import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

interface AnalyticsTopicData {
  topic: string;
  correct: number;
  empty: number;
  wrong: number;
  total: number;
  net: number;
}

interface AnalyticsSubjectData {
  subject: string;
  data: AnalyticsTopicData[];
}

interface ReadingAnalyticsData {
  week: string;
  pages: number;
}

export const generateWordReport = (
  studentName: string,
  timePeriod: string,
  analyticsData: AnalyticsSubjectData[],
  readingData: ReadingAnalyticsData[]
) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `${studentName} - Performans Raporu`,
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Rapor Tarihi: ${format(new Date(), 'dd.MM.yyyy')}`,
              italics: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Zaman Aralığı: ${timePeriod}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        ...(readingData.length > 0 ? (() => {
          const totalPages = readingData.reduce((sum, item) => sum + item.pages, 0);
          return [
            new Paragraph({
              text: "Kitap Okuma Performansı",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hafta", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Okunan Sayfa", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                ...readingData.map(item => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.week)] }),
                    new TableCell({ children: [new Paragraph({ text: item.pages.toString(), alignment: AlignmentType.CENTER })] }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Toplam", bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalPages.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
              ],
            }),
          ];
        })() : []),

        ...analyticsData.flatMap(subjectData => {
          const totalCorrect = subjectData.data.reduce((sum, d) => sum + d.correct, 0);
          const totalWrong = subjectData.data.reduce((sum, d) => sum + d.wrong, 0);
          const totalEmpty = subjectData.data.reduce((sum, d) => sum + d.empty, 0);
          const totalQuestions = subjectData.data.reduce((sum, d) => sum + d.total, 0);
          const totalNet = subjectData.data.reduce((sum, d) => sum + d.net, 0);

          return [
            new Paragraph({
              text: subjectData.subject,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Konu", bold: true })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Doğru", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Yanlış", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Boş", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Toplam", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Net", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                ...subjectData.data.map(topic => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(topic.topic)] }),
                    new TableCell({ children: [new Paragraph({ text: topic.correct.toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topic.wrong.toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topic.empty.toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topic.total.toString(), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topic.net.toFixed(2), alignment: AlignmentType.CENTER })] }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Genel Toplam", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalCorrect.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalWrong.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalEmpty.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalQuestions.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalNet.toFixed(2), bold: true })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
              ],
            }),
          ];
        }),
      ],
    }],
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `rapor-${studentName.replace(' ', '_')}-${format(new Date(), 'yyyyMMdd')}.docx`);
  });
};