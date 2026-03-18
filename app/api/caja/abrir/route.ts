import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { sucursal_id, monto_inicial } = await req.json();

    console.log("Abriendo caja:", { sucursal_id, monto_inicial });

    // Verificar si ya hay una caja abierta
    const [cajasExistentes]: any = await db.query(
      "SELECT * FROM caja WHERE sucursal_id = ? AND estado = 'ABIERTA'",
      [sucursal_id]
    );

    if (cajasExistentes.length > 0) {
      return NextResponse.json(
        { error: "Ya hay una caja abierta en esta sucursal" },
        { status: 400 }
      );
    }

    // Insertar nueva caja
    const [result]: any = await db.query(
      "INSERT INTO caja (sucursal_id, monto_inicial, monto_actual, estado, fecha_apertura) VALUES (?, ?, ?, 'ABIERTA', NOW())",
      [sucursal_id, monto_inicial, monto_inicial]
    );

    // Obtener la caja creada
    const [nuevaCaja]: any = await db.query(
      "SELECT * FROM caja WHERE id = ?",
      [result.insertId]
    );

    return NextResponse.json(nuevaCaja[0], { status: 201 });

  } catch (error) {
    console.error("Error al abrir caja:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}