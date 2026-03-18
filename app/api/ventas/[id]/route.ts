import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener venta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [rows]: any = await db.query(
      `SELECT v.*, s.nombre as sucursal_nombre, u.nombre as usuario_nombre,
              (SELECT JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', vd.id,
                   'producto_id', vd.producto_id,
                   'producto_nombre', p.nombre,
                   'producto_etiqueta', p.etiqueta,
                   'cantidad', vd.cantidad,
                   'precio_unitario', vd.precio_unitario,
                   'subtotal', vd.subtotal,
                   'iva', vd.iva,
                   'total', vd.total
                 )
               ) FROM venta_detalles vd 
               LEFT JOIN productos p ON vd.producto_id = p.id 
               WHERE vd.venta_id = v.id) as productos,
              (SELECT JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'metodo', vp.metodo,
                   'monto', vp.monto,
                   'referencia', vp.referencia
                 )
               ) FROM venta_pagos vp WHERE vp.venta_id = v.id) as pagos
       FROM ventas v
       LEFT JOIN sucursales s ON v.sucursal_id = s.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const venta = {
      ...rows[0],
      productos: rows[0].productos ? JSON.parse(rows[0].productos) : [],
      pagos: rows[0].pagos ? JSON.parse(rows[0].pagos) : []
    };

    return NextResponse.json(venta);
  } catch (error) {
    console.error('Error en GET venta:', error);
    return NextResponse.json({ error: 'Error al obtener venta' }, { status: 500 });
  }
}

// PUT - Actualizar venta (solo para casos especiales, generalmente no se usa)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Operación no permitida' }, { status: 405 });
}