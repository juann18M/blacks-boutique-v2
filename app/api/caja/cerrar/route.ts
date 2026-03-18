import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { caja_id } = await req.json();

    if (!caja_id) {
      return NextResponse.json(
        { error: "caja_id es requerido" },
        { status: 400 }
      );
    }

    await db.query(
      "UPDATE caja SET estado = 'CERRADA', fecha_cierre = NOW() WHERE id = ?",
      [caja_id]
    );

    return NextResponse.json({ message: "Caja cerrada correctamente" });

  } catch (error) {
    console.error("Error al cerrar caja:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}