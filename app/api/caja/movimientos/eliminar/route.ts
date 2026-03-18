import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(req: Request) {
  try {
    const { movimiento_id } = await req.json();

    if (!movimiento_id) {
      return NextResponse.json(
        { error: "movimiento_id es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el movimiento existe
    const [movimientos]: any = await db.query(
      "SELECT * FROM movimientos_caja WHERE id = ?",
      [movimiento_id]
    );

    if (movimientos.length === 0) {
      return NextResponse.json(
        { error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el movimiento directamente
    await db.query(
      "DELETE FROM movimientos_caja WHERE id = ?",
      [movimiento_id]
    );

    return NextResponse.json({ 
      message: "Movimiento eliminado correctamente" 
    });

  } catch (error) {
    console.error("Error al eliminar movimiento:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}