const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} = require("docx");
const Test = require("../model/test");
const Result = require("../model/result");
const User = require("../model/user");

exports.downloadResultsWord = async (req, res) => {
  try {
    const testId = req.params.id;

    // Test title olish
    const test = await Test.findById(testId);
    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test topilmadi" });
    }

    // Natijalarni olish
    const results = await Result.find({ testId });

    // Talabalar ma’lumotlari bilan bog‘lash
    const fullData = [];
    for (let r of results) {
      const user = await User.findById(r.studentId);

      fullData.push({
        name: user ? user.name : "Noma’lum",
        faculty: user ? user.faculty : "-",
        group: user ? user.groupNumber : "-",
        correct: r.correct,
        wrong: r.wrong,
        percent: r.percent,
        grade: r.grade,
      });
    }

    // Word dokument yaratish
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Test natijalari – ${test.title}`,
                  bold: true,
                  size: 32,
                }),
              ],
            }),

            new Paragraph({ text: "" }),

            // Jadval yaratish
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("№")] }),
                    new TableCell({ children: [new Paragraph("Talaba")] }),
                    new TableCell({ children: [new Paragraph("Fakultet")] }),
                    new TableCell({ children: [new Paragraph("Guruh")] }),
                    new TableCell({ children: [new Paragraph("To‘g‘ri")] }),
                    new TableCell({ children: [new Paragraph("Noto‘g‘ri")] }),
                    new TableCell({ children: [new Paragraph("Foiz")] }),
                    new TableCell({ children: [new Paragraph("Baho")] }),
                  ],
                }),

                ...fullData.map(
                  (item, idx) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(String(idx + 1))],
                        }),
                        new TableCell({ children: [new Paragraph(item.name)] }),
                        new TableCell({
                          children: [new Paragraph(item.faculty)],
                        }),
                        new TableCell({
                          children: [new Paragraph(item.group)],
                        }),
                        new TableCell({
                          children: [new Paragraph(String(item.correct))],
                        }),
                        new TableCell({
                          children: [new Paragraph(String(item.wrong))],
                        }),
                        new TableCell({
                          children: [new Paragraph(item.percent + "%")],
                        }),
                        new TableCell({
                          children: [new Paragraph(String(item.grade))],
                        }),
                      ],
                    })
                ),
              ],
            }),
          ],
        },
      ],
    });

    // Fayl nomi → Test title asosida
    const safeFileName = test.title
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_");

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${safeFileName}_natijalar.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
