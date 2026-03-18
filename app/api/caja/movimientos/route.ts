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

    // Obtener movimientos de la sucursal
    const [movimientos]: any = await db.query(
      `SELECT m.*, c.sucursal_id 
       FROM movimientos_caja m
       JOIN caja c ON m.caja_id = c.id
       WHERE c.sucursal_id = ?
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [sucursal_id]
    );

    return NextResponse.json(movimientos);

  } catch (error) {
    console.error("Error al cargar movimientos:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}