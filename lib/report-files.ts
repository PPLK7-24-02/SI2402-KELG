import path from "node:path";

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