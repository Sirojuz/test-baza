const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function randomName() {
  return Date.now().toString(36) + "-" + crypto.randomBytes(8).toString("hex");
}

function isWmfEmf(ext) {
  const e = String(ext || "").toLowerCase();
  return e === "wmf" || e === "x-wmf" || e === "emf" || e === "x-emf";
}

function normalizeExtFromContentType(contentType) {
  const ct = String(contentType || "").toLowerCase(); // ex: image/x-wmf
  const part = ct.includes("/") ? ct.split("/")[1] : "";
  // ba'zan "jpeg" keladi, ba'zan "pjpeg" - oddiylashtiramiz
  if (part === "jpeg") return "jpg";
  if (part === "pjpeg") return "jpg";
  return part || "bin";
}

function tryMagickConvert(inputPath, outputPath) {
  // Windows: "magick" ishlaydi (convert emas)
  const magickCmd = process.env.MAGICK_PATH || "magick";
  execFileSync(magickCmd, [inputPath, outputPath], { stdio: "ignore" });
}

function tryLibreOfficeConvertToPng(inputPath, outputDir) {
  const sofficeCmd = process.env.SOFFICE_PATH || "soffice";

  // LibreOffice output: outdir ichida "basename.png"
  execFileSync(
    sofficeCmd,
    [
      "--headless",
      "--nologo",
      "--nolockcheck",
      "--nodefault",
      "--norestore",
      "--convert-to",
      "png",
      "--outdir",
      outputDir,
      inputPath,
    ],
    { stdio: "ignore" }
  );

  const base = path.basename(inputPath, path.extname(inputPath));
  const pngPath = path.join(outputDir, base + ".png");

  if (!fs.existsSync(pngPath)) {
    throw new Error("LibreOffice PNG chiqarmadi (soffice convert failed)");
  }
  return pngPath;
}

/**
 * saveImage(buffer, contentType, opts)
 * - buffer: mammoth image buffer
 * - contentType: "image/png", "image/x-wmf"...
 * - opts.baseUrl: "http://localhost:3100" yoki prod domen
 * - opts.uploadDir: absolut yoki relative "uploads"
 * - opts.track: [] (rollback uchun shu yerga yozib boradi)
 */
async function saveImage(buffer, contentType, opts = {}) {
  const baseUrl = opts.baseUrl || "";
  const uploadDir = opts.uploadDir || path.resolve("uploads");
  const track = Array.isArray(opts.track) ? opts.track : null;

  ensureDir(uploadDir);

  const ext = normalizeExtFromContentType(contentType);
  const name = randomName();

  // avval temp/real faylni yozamiz
  const rawPath = path.join(uploadDir, `${name}.${ext}`);
  fs.writeFileSync(rawPath, buffer);
  if (track) track.push(rawPath);

  // wmf/emf bo'lsa pngga aylantiramiz
  if (isWmfEmf(ext)) {
    const pngPath = path.join(uploadDir, `${name}.png`);

    // 1) avval ImageMagick
    let converted = false;
    try {
      tryMagickConvert(rawPath, pngPath);
      converted = fs.existsSync(pngPath);
    } catch (e) {
      converted = false;
    }

    // 2) bo'lmasa LibreOffice
    if (!converted) {
      try {
        const loPng = tryLibreOfficeConvertToPng(rawPath, uploadDir);
        // LibreOffice shu nom bilan chiqaradi: name.png
        // (input rawPath basename = name)
        converted = fs.existsSync(loPng);
      } catch (e) {
        // ikkalasi ham bo'lmadi
        throw new Error(
          `WMF/EMF PNGga convert bo'lmadi. ImageMagick yoki LibreOffice sozlanmagan. contentType=${contentType}`
        );
      }
    }

    // raw faylni o'chiramiz (wmf/emf faylni serverda ushlab o'tirmaymiz)
    try {
      fs.unlinkSync(rawPath);
    } catch (_) {}

    // track'dan rawPath ni olib tashlab, pngPath ni track qilamiz
    if (track) {
      const idx = track.indexOf(rawPath);
      if (idx !== -1) track.splice(idx, 1);
      track.push(pngPath);
    }

    const url = `${baseUrl}/uploads/${path.basename(pngPath)}`;
    return url;
  }

  // oddiy rasm
  return `${baseUrl}/uploads/${path.basename(rawPath)}`;
}

module.exports = { saveImage };
