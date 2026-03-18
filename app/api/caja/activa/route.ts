import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sucursal_id = searchParams.get("sucursal_id");

    if (!sucursal_id) {
      return NextResponse.json(
        { error: "sucursal_id es requerido" },
        { status: 400 }
      );
    }

    const [cajas]: any = await db.query(
      "SELECT * FROM caja WHERE sucursal_id = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1",
      [sucursal_id]
    );

    if (cajas.length === 0) {
      return NextResponse.json(
        { error: "No hay caja abierta" },
        { status: 404 }
      );
    }

    return NextResponse.json(cajas[0]);

  } catch (error) {
    console.error("Error al obtener caja:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}