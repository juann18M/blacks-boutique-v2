import { db } from "@/lib/db"; // o donde tengas tu conexión

export async function GET() {
  try {
    const conn = await db.getConnection();
    conn.release();

    return Response.json({ ok: true, message: "Conectado" });
  } catch (error) {
    console.error("ERROR REAL:", error);

    return Response.json({
      ok: false,
      error: error.message,
      code: error.code,
    });
  }
}