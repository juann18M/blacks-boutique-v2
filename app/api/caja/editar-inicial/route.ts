import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { caja_id, monto_inicial, razon, usuario_id, usuario_nombre } = await req.json();

    console.log("Editando monto inicial:", { caja_id, monto_inicial, razon, usuario_id, usuario_nombre });

    // Validaciones
    if (!caja_id || monto_inicial === undefined) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (caja_id, monto_inicial)" },
        { status: 400 }
      );
    }

    if (!razon || razon.trim() === '') {
      return NextResponse.json(
        { error: "Debes proporcionar una razón para la edición" },
        { status: 400 }
      );
    }

    // Verificar que la caja existe y está abierta
    const [cajas]: any = await db.query(
      "SELECT * FROM caja WHERE id = ? AND estado = 'ABIERTA'",
      [caja_id]
    );

    if (cajas.length === 0) {
      return NextResponse.json(
        { error: "Caja no encontrada o no está abierta" },
        { status: 404 }
      );
    }

    const cajaActual = cajas[0];
    
    // Calcular la diferencia para ajustar el monto actual
    const diferencia = monto_inicial - Number(cajaActual.monto_inicial);
    const nuevoMontoActual = Number(cajaActual.monto_actual) + diferencia;

    // Iniciar transacción
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Actualizar la caja
      await connection.query(
        "UPDATE caja SET monto_inicial = ?, monto_actual = ? WHERE id = ?",
        [monto_inicial, nuevoMontoActual, caja_id]
      );

      // 2. Registrar el movimiento en historial con la razón
      await connection.query(
        `INSERT INTO movimientos_caja 
         (caja_id, tipo, monto_anterior, monto_nuevo, razon, usuario_id, usuario_nombre) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          caja_id, 
          'EDICION_INICIAL', 
          cajaActual.monto_inicial, 
          monto_inicial, 
          razon, 
          usuario_id, 
          usuario_nombre
        ]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json({ 
        message: "Monto inicial actualizado",
        nuevo_balance: nuevoMontoActual,
        diferencia: diferencia,
        razon: razon
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error("Error al editar monto inicial:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}