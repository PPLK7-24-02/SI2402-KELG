import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";

export const MAX_REPORT_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_REPORT_FILES = 5;

export const REPORT_FILE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/webm": "weba",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function getReportUploadDirectory() {
  return path.resolve(
    process.env.REPORT_UPLOAD_DIR ??
      path.join(process.cwd(), ".private-uploads")
  );
}

// SOS only: keep the regular report's existing MIME/validation contract intact.
export function normalizeEmergencyMediaType(value: string) {
  const type = value.split(";", 1)[0].trim().toLowerCase();
  return ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"].includes(type) ? type : null;
}

export function validEmergencyMedia(bytes: Buffer, type: string) {
  if (!bytes.length || bytes.length > MAX_REPORT_FILE_SIZE) return false;
  if (type === "image/jpeg") {
    if (bytes.length < 16 || !bytes.subarray(0, 2).equals(Buffer.from([255, 216]))) return false;
    let offset = 2, frame = false, scan = false, entropy = false;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) return false;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217) return frame && scan && entropy && offset === bytes.length;
      if (offset + 2 > bytes.length || marker === 216 || marker === 0) return false;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return false;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8 || !bytes.readUInt16BE(offset + 3) || !bytes.readUInt16BE(offset + 5)) return false;
        frame = true;
      }
      offset += length;
      if (marker === 218) {
        if (!frame || length < 6) return false;
        scan = true;
        while (offset < bytes.length) {
          if (bytes[offset] !== 255) { entropy = true; offset++; continue; }
          const next = bytes[offset + 1];
          if (next === 0 || (next >= 208 && next <= 215)) { entropy = true; offset += 2; continue; }
          break;
        }
      }
    }
    return false;
  }
  if (type === "image/png") {
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false;
    let offset = 8, image = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const chunk = bytes.toString("ascii", offset + 4, offset + 8);
      if (length > bytes.length - offset - 12) return false;
      if (offset === 8 && (chunk !== "IHDR" || length !== 13 || !bytes.readUInt32BE(offset + 8) || !bytes.readUInt32BE(offset + 12))) return false;
      if (chunk === "IDAT" && length > 0) image = true;
      offset += length + 12;
      if (chunk === "IEND") return length === 0 && offset === bytes.length && image;
    }
    return false;
  }
  if (type === "image/webp") return bytes.length >= 20 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.readUInt32LE(4) + 8 === bytes.length && bytes.toString("ascii", 8, 12) === "WEBP" && ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16));
  if (type === "video/webm") return bytes.length > 32 && bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) &&
    bytes.indexOf(Buffer.from([66, 130])) >= 0 && bytes.indexOf(Buffer.from("webm")) >= 0 &&
    bytes.indexOf(Buffer.from([24, 83, 128, 103])) >= 0 && bytes.indexOf(Buffer.from([22, 84, 174, 107])) >= 0 && bytes.indexOf(Buffer.from([31, 67, 182, 117])) >= 0;
  if (type === "video/mp4" || type === "video/quicktime") {
    let offset = 0, brand = false, movie = false, media = false;
    while (offset + 8 <= bytes.length) {
      let length = bytes.readUInt32BE(offset), header = 8;
      const box = bytes.toString("ascii", offset + 4, offset + 8);
      if (length === 1) {
        if (offset + 16 > bytes.length) return false;
        const large = bytes.readBigUInt64BE(offset + 8);
        if (large > BigInt(bytes.length)) return false;
        length = Number(large); header = 16;
      } else if (length === 0) length = bytes.length - offset;
      if (length < header || length > bytes.length - offset) return false;
      if (box === "ftyp" && length >= header + 8) {
        const brands = bytes.toString("ascii", offset + header, offset + length);
        brand = type === "video/quicktime" ? brands.includes("qt  ") : /isom|iso[2-9]|mp4[12]|avc1|M4V |dash/.test(brands);
      }
      if (box === "moov") movie = length > header;
      if (box === "mdat") media = length > header;
      offset += length;
    }
    return offset === bytes.length && brand && movie && media;
  }
  return false;
}

export async function saveEmergencyMedia(bytes: Buffer, type: string) {
  if (!normalizeEmergencyMediaType(type) || !REPORT_FILE_TYPES[type]) throw new Error("Unsupported emergency media");
  const directory = getReportUploadDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const storedName = `${randomUUID()}.${REPORT_FILE_TYPES[type]}`;
  const savedPath = path.join(directory, storedName);
  try {
    await writeFile(savedPath, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    // wx prevents overwrites; never unlink a pre-existing file on EEXIST.
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) await unlink(savedPath).catch(() => undefined);
    throw error;
  }
  return { savedPath, fileUrl: `private://${storedName}` };
}

export async function removeNewEmergencyMedia(savedPath: string) {
  if (path.dirname(savedPath) !== getReportUploadDirectory() || !/^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(path.basename(savedPath))) throw new Error("Invalid private upload path");
  await unlink(savedPath);
}
