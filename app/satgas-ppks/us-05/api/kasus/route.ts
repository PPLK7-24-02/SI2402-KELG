import prisma from "@/lib/prisma";
import { listSchema } from "../../contracts";
import { json, parse, query, withSatgas } from "../../server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withSatgas(async () => {
    const { q, cursor } = parse(listSchema, query(request));
    const rows = await prisma.laporan.findMany({
      where: q ? { nomorKasus: { contains: q } } : {},
      select: { idLaporan: true, nomorKasus: true, jenis: true, status: true },
      orderBy: [{ createdAt: "desc" }, { idLaporan: "desc" }],
      take: 26,
      ...(cursor ? { cursor: { idLaporan: cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, 25);
    return json({ items, nextCursor: rows.length > 25 ? items.at(-1)?.idLaporan ?? null : null });
  });
}
