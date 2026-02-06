const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const path = require("path");
const crypto = require("crypto");
const mammoth = require("mammoth");
const mongoose = require("mongoose");
const TestOne = require("../model/testOne");
const Attempt = require("../model/attempt");
const TestInfo = require("../model/testInfo");
const cheerio = require("cheerio");
const BASE_URL = "http://localhost:3100";
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

const PANDOC =
  process.platform === "win32"
    ? "C:\\Users\\eltnk\\AppData\\Local\\Pandoc\\pandoc.exe"
    : "pandoc";

const MAGICK =
  process.platform === "win32"
    ? "C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe"
    : "convert";

exports.startTest = async (req, res) => {
  try {
    const { studentCode, testId } = req.query;

    let attempt = await Attempt.findOne({ studentCode, testId });

    if (attempt) {
      return res.json({
        success: true,
        questions: attempt.questions,
        attemptId: attempt._id,
      });
    }

    const info = await TestInfo.findOne({ testId });
    const randomCount = info.randomCount;

    const questions = await TestOne.aggregate([
      { $match: { testId: new mongoose.Types.ObjectId(testId) } },
      { $sample: { size: randomCount } },
    ]);

    attempt = await Attempt.create({
      studentCode,
      testId,
      questions,
    });

    res.json({
      success: true,
      questions,
      attemptId: attempt._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadWord = async (req, res) => {
  const createdFiles = [];

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File yuklanmadi!" });
    }

    const testId = req.body.testId;
    if (!testId) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "testId yuborilishi shart!" });
    }

    const randomCount = Number(req.body.randomCount || 0);
    if (randomCount) {
      await TestInfo.findOneAndUpdate(
        { testId },
        { randomCount },
        { upsert: true, new: true },
      );
    }

    const { html: rawHtml, tmpDir } = convertDocxToHtmlPandoc(req.file.path);

    const html = moveImagesToUploadsAndRewriteHtml(
      rawHtml,
      tmpDir,
      createdFiles,
    );

    let tests = parseHtmlToTests(html, BASE_URL);
    tests = tests.map((t) => ({ ...t, testId }));

    if (!tests.length) {
      for (const f of createdFiles) {
        try {
          if (f?.abs && fs.existsSync(f.abs)) fs.unlinkSync(f.abs);
        } catch {}
      }

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
      try {
        fs.unlinkSync(req.file.path);
      } catch {}

      return res.status(400).json({
        success: false,
        message:
          "Word shabloni bo‘yicha savol/variant topilmadi (*, +, = ni tekshiring). Rasmlar ham saqlanmadi.",
      });
    }

    cleanupUnusedUploadedImages(createdFiles, tests);

    const saved = await TestOne.insertMany(tests);

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    fs.unlinkSync(req.file.path);

    return res.json({ success: true, totalSaved: saved.length });
  } catch (err) {
    for (const fp of createdFiles) {
      try {
        fs.unlinkSync(fp);
      } catch {}
    }
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}

    return res.status(500).json({ success: false, message: err.message });
  }
};

function convertDocxToHtmlPandoc(docxPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docx-"));
  const outHtml = path.join(tmpDir, "out.html");

  try {
    execFileSync(
      PANDOC,
      [
        "-f",
        "docx",
        docxPath,
        "-t",
        "html",
        "--mathjax",
        "--extract-media",
        tmpDir,
        "-o",
        outHtml,
      ],
      { stdio: "pipe" },
    );
  } catch (e) {
    const msg = e?.stderr ? e.stderr.toString() : e.message;
    throw new Error("Pandoc xatosi: " + msg);
  }

  if (!fs.existsSync(outHtml)) {
    throw new Error("Pandoc HTML chiqarmadi (out.html topilmadi)");
  }

  let html = fs.readFileSync(outHtml, "utf8");
  return { html, tmpDir };
}

function moveImagesToUploadsAndRewriteHtml(html, tmpDir, createdFiles) {
  html = html.replace(/&lt;(img\b[^&]*)&gt;/gi, "<$1>");

  return html.replace(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    (fullTag, src) => {
      const resolved = resolveExtractedMediaPath(src, tmpDir);
      if (!resolved) return fullTag;

      const ext = path.extname(resolved).toLowerCase();
      let finalPath = resolved;

      if ([".wmf", ".emf", ".x-wmf"].includes(ext)) {
        finalPath = convertVectorToPng(resolved, path.dirname(resolved), {
          density: 450,
          fuzz: "2%",
          trim: true,
          maxPx: 3000,
        });
      } else {
        finalPath = resolved;
      }

      const outExt = (path.extname(finalPath) || ".png").toLowerCase();
      const fileName = `${Date.now()}-${crypto
        .randomBytes(6)
        .toString("hex")}${outExt}`;
      const uploadAbs = path.join(UPLOAD_DIR, fileName);

      if (!fs.existsSync(UPLOAD_DIR))
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.copyFileSync(finalPath, uploadAbs);

      const newSrc = `/uploads/${fileName}`;
      createdFiles.push({ abs: uploadAbs, rel: newSrc });

      return fullTag.replace(src, newSrc);
    },
  );
}

function resolveExtractedMediaPath(src, tmpDir) {
  let p = String(src || "").trim();

  if (p.startsWith("file://")) {
    p = p.replace("file:///", "").replace("file://", "");
    p = p.replace(/^\/([A-Za-z]:\/)/, "$1");
    if (fs.existsSync(p)) return p;
  }

  if (fs.existsSync(p)) return p;

  const p2 = path.isAbsolute(p) ? p : path.join(tmpDir, p);
  if (fs.existsSync(p2)) return p2;

  const p3 = path.join(tmpDir, path.basename(p));
  if (fs.existsSync(p3)) return p3;

  const p4 = path.join(tmpDir, "media", path.basename(p));
  if (fs.existsSync(p4)) return p4;

  return null;
}

function htmlToBlocks(htmlLine, baseUrl) {
  const blocks = [];
  const $ = cheerio.load(`<root>${htmlLine || ""}</root>`, {
    decodeEntities: true,
  });

  function pushBlock(block) {
    if (!block || !block.value || !String(block.value).trim()) return;

    const last = blocks[blocks.length - 1];
    if (last && last.type === block.type) {
      last.value += block.type === "image" ? "" : block.value;
      return;
    }
    blocks.push(block);
  }

  function cleanSrc(src) {
    let s = String(src || "").trim();
    try {
      if (s.startsWith("http")) s = new URL(s).pathname;
    } catch {}
    if (!s.startsWith("/")) s = "/" + s;
    return s;
  }

  function splitTextIntoTextAndMath(text) {
    const t = String(text || "").replace(/\u00A0/g, " ");
    const re = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;

    let last = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      const before = t.slice(last, m.index);
      if (before) pushBlock({ type: "text", value: before });

      const math = m[1].replace(/\r?\n/g, " ");
      pushBlock({ type: "math", value: math });

      last = re.lastIndex;
    }

    const after = t.slice(last);
    if (after) pushBlock({ type: "text", value: after });
  }

  function toUnicodeSubscript(s) {
    const map = {
      0: "₀",
      1: "₁",
      2: "₂",
      3: "₃",
      4: "₄",
      5: "₅",
      6: "₆",
      7: "₇",
      8: "₈",
      9: "₉",
      "+": "₊",
      "-": "₋",
      "=": "₌",
      "(": "₍",
      ")": "₎",
      n: "ₙ",
      i: "ᵢ", // i va n ba’zan kerak bo‘ladi
    };
    return String(s || "")
      .split("")
      .map((ch) => map[ch] || ch)
      .join("");
  }

  function toUnicodeSuperscript(s) {
    const map = {
      0: "⁰",
      1: "¹",
      2: "²",
      3: "³",
      4: "⁴",
      5: "⁵",
      6: "⁶",
      7: "⁷",
      8: "⁸",
      9: "⁹",
      "+": "⁺",
      "-": "⁻",
      "=": "⁼",
      "(": "⁽",
      ")": "⁾",
      n: "ⁿ",
      i: "ⁱ",
    };
    return String(s || "")
      .split("")
      .map((ch) => map[ch] || ch)
      .join("");
  }

  function walk(node) {
    if (!node) return;

    if (node.type === "text") {
      splitTextIntoTextAndMath(node.data);
      return;
    }

    if (node.type === "tag") {
      const name = (node.name || "").toLowerCase();

      if (name === "sub") {
        const txt = $(node).text();
        if (txt) pushBlock({ type: "text", value: toUnicodeSubscript(txt) });
        return;
      }

      if (name === "sup") {
        const txt = $(node).text();
        if (txt) pushBlock({ type: "text", value: toUnicodeSuperscript(txt) });
        return;
      }

      if (name === "img") {
        const src = $(node).attr("src");
        if (src) pushBlock({ type: "image", value: cleanSrc(src) });
        return;
      }

      if (name === "span" && ($(node).attr("class") || "").includes("math")) {
        let tex = $(node).text() || "";
        tex = tex.replace(/\r?\n/g, " ").trim();
        if (tex) pushBlock({ type: "math", value: tex });
        return;
      }

      $(node)
        .contents()
        .each((_, ch) => walk(ch));
      return;
    }
  }

  $("root")
    .contents()
    .each((_, n) => walk(n));

  return blocks.filter((b) => b && b.value && String(b.value).trim() !== "");
}

function extractLeadingMarker(blocks) {
  const out = Array.isArray(blocks) ? blocks.map((b) => ({ ...b })) : [];
  let marker = null;

  // birinchi text blokdan marker qidiramiz
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    if (!b) continue;

    // faqat text blokda marker bo‘ladi
    if (b.type !== "text") {
      // agar boshida image bo‘lsa ham marker yo‘q deb hisoblaymiz
      break;
    }

    // marker faqat satr boshida (whitespace/NBSP dan keyin)
    const m = String(b.value || "").match(/^[\s\u00A0]*([*+=])[\s\u00A0]*/);
    if (!m) break;

    marker = m[1];

    // marker va undan keyingi bo‘sh joylarni olib tashlaymiz (1-2 space bo‘lsa ham, ko‘p bo‘lsa ham)
    b.value = String(b.value || "").replace(
      /^[\s\u00A0]*([*+=])[\s\u00A0]*/,
      "",
    );

    // agar marker bo‘lib, text bo‘sh bo‘lib qolsa — blockni olib tashlaymiz
    if (!b.value || !b.value.trim()) out.splice(i, 1);

    break; // marker topildi — boshqa qidirmaymiz
  }

  return { marker, blocks: out };
}

function parseHtmlToTests(html, baseUrl) {
  const lines = extractLogicalLinesFromHtml(html);

  const tests = [];
  let questionBlocks = [];
  let options = [];
  let mode = null; // null | "question" | "option"

  const normalizeBlocks = (blocks) =>
    (Array.isArray(blocks) ? blocks : [])
      .filter((b) => b && typeof b.value === "string")
      .map((b) => ({ ...b, value: String(b.value).replace(/\u00A0/g, " ") }))
      .filter((b) => b.value.trim() !== "");

  // bu funksiya: eski savolni yakunlab bazaga qo‘shadi yoki talabga javob bermasa tashlab ketadi
  const flush = () => {
    questionBlocks = normalizeBlocks(questionBlocks);

    // savol bo‘sh bo‘lsa — tashlaymiz
    if (questionBlocks.length === 0) {
      options = [];
      mode = null;
      return;
    }

    const cleanedOptions = (options || [])
      .map((o) => ({ ...o, blocks: normalizeBlocks(o.blocks) }))
      .filter((o) => o.blocks.length > 0);

    // variantlar < 2 bo‘lsa — tashlaymiz
    if (cleanedOptions.length < 2) {
      questionBlocks = [];
      options = [];
      mode = null;
      return;
    }

    // to‘g‘ri javob bo‘lmasa (+ yo‘q bo‘lsa) — tashlaymiz
    const correctIndex = cleanedOptions.findIndex((o) => o.isCorrect);
    if (correctIndex === -1) {
      questionBlocks = [];
      options = [];
      mode = null;
      return;
    }

    // shuffle
    const optionObjs = cleanedOptions.map((o) => ({ blocks: o.blocks }));
    const { newOptions, newCorrectIndex } = shuffleOptionsKeepCorrect(
      optionObjs,
      correctIndex,
    );

    tests.push({
      questionBlocks,
      options: newOptions,
      correctIndex: newCorrectIndex,
    });

    // keyingi savol uchun tozalaymiz
    questionBlocks = [];
    options = [];
    mode = null;
  };

  for (const lineHtml of lines) {
    const blocksRaw = htmlToBlocks(lineHtml, baseUrl);
    const blocks = normalizeBlocks(blocksRaw);

    // bo‘sh qator bo‘lsa o‘tib ket
    if (!blocks.length) continue;

    const { marker, blocks: contentBlocks } = extractLeadingMarker(blocks);

    // 1) Yangi savol
    if (marker === "*") {
      // oldingi savolni tugatamiz (talabga javob bermasa avtomatik tashlanadi)
      flush();

      // yangi savolni boshlaymiz
      questionBlocks = normalizeBlocks(contentBlocks);
      options = [];
      mode = "question";
      continue;
    }

    // 2) Variantlar: faqat savol boshlangan bo‘lsa qabul qilamiz
    if (marker === "+" || marker === "=") {
      // hali savol boshlanmagan bo‘lsa — tashlab yuboramiz (shovqin/keraksiz qator)
      if (mode === null) continue;

      options.push({
        blocks: normalizeBlocks(contentBlocks),
        isCorrect: marker === "+",
      });
      mode = "option";
      continue;
    }

    // 3) Marker yo‘q: davom satr
    // Savol hali boshlanmagan bo‘lsa — buni ham tashlaymiz
    if (mode === null) continue;

    // Agar variant yozilayotgan bo‘lsa — oxirgi variantga qo‘shamiz
    if (mode === "option" && options.length > 0) {
      options[options.length - 1].blocks = (
        options[options.length - 1].blocks || []
      ).concat(contentBlocks);
      continue;
    }

    // Aks holda savolning davomi
    if (mode === "question") {
      questionBlocks = (questionBlocks || []).concat(contentBlocks);
      continue;
    }
  }

  // fayl tugadi — oxirgi savolni ham yakunlaymiz
  flush();

  return tests;
}

function extractLogicalLinesFromHtml(html) {
  const $ = cheerio.load(html || "", { decodeEntities: true });

  const root = $("body").length ? $("body") : $.root();
  const lines = [];

  function isEmptyHtml(s) {
    const plain = String(s || "")
      .replace(/<br\s*\/?>/gi, "")
      .replace(/<[^>]+>/g, "") // taglarni olib tashlash
      .replace(/&nbsp;|\u00A0/g, " ") // NBSP
      .replace(/\s+/g, " ")
      .trim();
    return plain.length === 0;
  }

  function pushLine(parts) {
    const s = parts.join("");
    if (!isEmptyHtml(s)) lines.push(s); // bo‘sh qatorlar kirmaydi
  }

  function splitByBr($container) {
    let current = [];
    $container.contents().each((_, node) => {
      if (node.type === "tag" && (node.name || "").toLowerCase() === "br") {
        pushLine(current);
        current = [];
      } else {
        current.push($.html(node));
      }
    });
    pushLine(current);
  }

  root.find("p, li").each((_, p) => splitByBr($(p)));

  if (lines.length === 0) splitByBr(root);
  return lines;
}

function convertVectorToPng(localPath, workDir, opts = {}) {
  const ext = path.extname(localPath).toLowerCase();
  if (![".wmf", ".emf", ".x-wmf"].includes(ext)) return localPath;

  const density = String(opts.density ?? 450); // 600–1200
  const fuzz = String(opts.fuzz ?? "2%"); // 5%–15%
  const scale = String(opts.scale ?? "100%"); // 150%–250%
  const maxPx = String(opts.maxPx ?? 3000); // 3000–5000

  const outPng = path.join(
    workDir,
    `${path.basename(localPath, ext)}-${Date.now()}.png`,
  );

  const args = [
    "-units",
    "PixelsPerInch",
    "-density",
    density, // MUHIM: inputdan oldin
    localPath,

    "-background",
    "white",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    "-colorspace",
    "sRGB",

    // MUHIM: bo‘sh oq joyni kesadi
    "-fuzz",
    fuzz,
    "-trim",
    "+repage",

    // kesilib ketmasin
    "-bordercolor",
    "white",
    "-border",
    "10x10",

    // text/elementlarni kattalashtiradi
    "-resize",
    scale,

    // haddan tashqari katta bo‘lib ketmasin
    "-resize",
    `${maxPx}x${maxPx}>`,

    outPng,
  ];

  try {
    execFileSync(MAGICK, args, { stdio: "pipe" });
    if (!fs.existsSync(outPng)) throw new Error("PNG chiqmagan");
    return outPng;
  } catch (e) {
    const msg = e?.stderr ? e.stderr.toString() : e.message;
    throw new Error("ImageMagick convert xatosi: " + msg);
  }
}

function shuffleOptionsKeepCorrect(optionObjs, correctIndex) {
  const arr = optionObjs.map((opt, idx) => ({ opt, idx }));

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const newOptions = arr.map((x) => x.opt);
  const newCorrectIndex = arr.findIndex((x) => x.idx === correctIndex);

  return { newOptions, newCorrectIndex };
}

function normalizeImgValueToRel(v) {
  if (!v) return "";
  let s = String(v).trim();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).pathname;
    }
  } catch {}
  s = s.split("?")[0].split("#")[0];
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

function collectUsedImagesFromTests(tests) {
  const used = new Set();

  for (const t of tests || []) {
    (t.questionBlocks || []).forEach((b) => {
      if (b?.type === "image") used.add(normalizeImgValueToRel(b.value));
    });

    (t.options || []).forEach((opt) => {
      (opt.blocks || []).forEach((b) => {
        if (b?.type === "image") used.add(normalizeImgValueToRel(b.value));
      });
    });
  }

  return used;
}

function cleanupUnusedUploadedImages(createdFiles, tests) {
  const used = collectUsedImagesFromTests(tests);

  for (const f of createdFiles || []) {
    const rel = normalizeImgValueToRel(f?.rel);
    if (!rel) continue;

    // testlarda ishlatilmagan bo'lsa o'chiramiz
    if (!used.has(rel)) {
      try {
        if (f?.abs && fs.existsSync(f.abs)) fs.unlinkSync(f.abs);
      } catch {}
    }
  }
}

exports.getAll = async (req, res) => {
  try {
    const data = await TestOne.find();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto‘g‘ri testId" });
    }
    const data = await TestOne.find({ testId: id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const saved = await TestOne.create(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await TestOne.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await TestOne.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "TestOne o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
