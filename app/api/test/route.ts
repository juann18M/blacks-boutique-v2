import { db } from "@/lib/db";

export async function GET() {
  try {
    const conn = await db.getConnection();
    conn.release();

    return Response.json({ ok: true, message: "Conectado" });
  } catch (error: any) {
    console.error("ERROR REAL:", error);

    return Response.json({
      ok: false,
      error: error?.message || "Error desconocido",
      code: error?.code || null,
    });
  }
}