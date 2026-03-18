import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const [sucursales]: any = await db.query(
      "SELECT * FROM sucursales WHERE id = ?",
      [id]
    );

    if (sucursales.length === 0) {
      return NextResponse.json(
        { error: "Sucursal no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(sucursales[0]);

  } catch (error) {
    console.error("Error al obtener sucursal:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}