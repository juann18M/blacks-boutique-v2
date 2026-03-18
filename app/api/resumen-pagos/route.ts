import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
    const caja_id = searchParams.get('caja_id');

    if (!sucursal_id) {
      return NextResponse.json({ error: 'sucursal_id requerido' }, { status: 400 });
    }

    // Si no hay caja_id, devolver todo en cero
    if (!caja_id || caja_id === 'null' || caja_id === '') {
      console.log('⚠️ No hay caja activa, resumen en cero');
      return NextResponse.json({
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        total: 0,
        cantidad: 0
      });
    }

    // SOLO VENTAS de la caja activa (apartados y abonos NO van en caja)
    const [ventas]: any = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN v.total ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as transferencia,
        COUNT(*) as cantidad
      FROM ventas v
      WHERE DATE(v.fecha) = CURDATE() 
        AND v.estado = 'completada'
        AND v.sucursal_id = ?
        AND v.caja_id = ?
    `, [sucursal_id, caja_id]);

    const efectivo_total = Number(ventas[0]?.efectivo || 0);
    const tarjeta_total = Number(ventas[0]?.tarjeta || 0);
    const transferencia_total = Number(ventas[0]?.transferencia || 0);
    const total_general = efectivo_total + tarjeta_total + transferencia_total;
    const cantidad = Number(ventas[0]?.cantidad || 0);

    const response = {
      efectivo: Number(efectivo_total.toFixed(2)),
      tarjeta: Number(tarjeta_total.toFixed(2)),
      transferencia: Number(transferencia_total.toFixed(2)),
      total: Number(total_general.toFixed(2)),
      cantidad: cantidad
    };

    console.log('💰 Ventas de la caja:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en GET resumen-pagos:', error);
    return NextResponse.json({ 
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      total: 0,
      cantidad: 0
    }, { status: 500 });
  }
}