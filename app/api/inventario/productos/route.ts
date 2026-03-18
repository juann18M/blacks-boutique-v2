import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
    const ubicacion = searchParams.get('ubicacion');
    const search = searchParams.get('search');

    let query = `
      SELECT 
        p.id,
        p.etiqueta,
        p.nombre,
        p.color,
        p.talla,
        p.precio,
        p.stock,
        p.ubicacion,
        p.imagen,
        (SELECT COUNT(*) FROM venta_detalles vd WHERE vd.producto_id = p.id) as veces_vendido,
        (SELECT SUM(vd.cantidad) FROM venta_detalles vd WHERE vd.producto_id = p.id) as total_vendido
      FROM productos p
      WHERE p.activo = true
    `;
    
    const values: any[] = [];

    if (sucursal_id) {
      query += ` AND p.sucursal_id = ?`;
      values.push(sucursal_id);
    }

    if (ubicacion) {
      query += ` AND p.ubicacion = ?`;
      values.push(ubicacion);
    }

    if (search) {
      query += ` AND (p.nombre LIKE ? OR p.etiqueta LIKE ? OR p.color LIKE ? OR p.talla LIKE ?)`;
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY p.ubicacion, p.nombre`;

    const [rows] = await db.query(query, values);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error en GET productos inventario:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}