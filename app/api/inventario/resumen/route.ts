import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');

    // Resumen general
    const [general]: any = await db.query(`
      SELECT 
        COUNT(*) as total_productos,
        SUM(stock) as total_piezas,
        SUM(precio * stock) as valor_total_inventario,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as productos_agotados,
        SUM(CASE WHEN stock <= 3 AND stock > 0 THEN 1 ELSE 0 END) as productos_stock_bajo,
        AVG(precio) as precio_promedio
      FROM productos
      WHERE activo = true ${sucursal_id ? 'AND sucursal_id = ?' : ''}
    `, sucursal_id ? [sucursal_id] : []);

    // Resumen por ubicación
    const [ubicaciones]: any = await db.query(`
      SELECT 
        ubicacion,
        COUNT(*) as total_productos,
        SUM(stock) as total_piezas,
        SUM(precio * stock) as valor_total,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as agotados,
        SUM(CASE WHEN stock <= 3 AND stock > 0 THEN 1 ELSE 0 END) as stock_bajo
      FROM productos
      WHERE activo = true AND ubicacion IS NOT NULL ${sucursal_id ? 'AND sucursal_id = ?' : ''}
      GROUP BY ubicacion
      ORDER BY ubicacion
    `, sucursal_id ? [sucursal_id] : []);

    // Últimos movimientos (ventas y ajustes) - CON MOTIVO
    // Últimos movimientos (ventas, ajustes y traslados)
const [ultimosMovimientos]: any = await db.query(`
  (SELECT 
    'venta' as tipo,
    v.folio as referencia,
    vd.cantidad,
    p.nombre as producto,
    v.created_at as fecha,
    u.nombre as usuario_nombre,
    NULL as motivo,
    NULL as origen,
    NULL as destino
  FROM venta_detalles vd
  JOIN ventas v ON vd.venta_id = v.id
  JOIN productos p ON vd.producto_id = p.id
  JOIN usuarios u ON v.usuario_id = u.id
  WHERE v.estado = 'completada' ${sucursal_id ? 'AND v.sucursal_id = ?' : ''}
  ORDER BY v.created_at DESC
  LIMIT 10)
  UNION ALL
  (SELECT 
    'ajuste' as tipo,
    CONCAT('Ajuste #', ia.id) as referencia,
    ia.diferencia as cantidad,
    p.nombre as producto,
    ia.created_at as fecha,
    u.nombre as usuario_nombre,
    ia.motivo,
    NULL as origen,
    NULL as destino
  FROM inventario_ajustes ia
  JOIN productos p ON ia.producto_id = p.id
  JOIN usuarios u ON ia.usuario_id = u.id
  WHERE 1=1 ${sucursal_id ? 'AND ia.sucursal_id = ?' : ''}
  ORDER BY ia.created_at DESC
  LIMIT 10)
  UNION ALL
  (SELECT 
    'traslado' as tipo,
    t.folio as referencia,
    t.cantidad,
    p.nombre as producto,
    t.created_at as fecha,
    u.nombre as usuario_nombre,
    t.motivo,
    so.nombre as origen,
    sd.nombre as destino
  FROM traslados t
  JOIN productos p ON t.producto_id = p.id
  JOIN sucursales so ON t.sucursal_origen_id = so.id
  JOIN sucursales sd ON t.sucursal_destino_id = sd.id
  JOIN usuarios u ON t.usuario_id = u.id
  WHERE 1=1 ${sucursal_id ? 'AND (t.sucursal_origen_id = ? OR t.sucursal_destino_id = ?)' : ''}
  ORDER BY t.created_at DESC
  LIMIT 10)
  ORDER BY fecha DESC
  LIMIT 30
`, sucursal_id ? [sucursal_id, sucursal_id, sucursal_id, sucursal_id] : []);

    return NextResponse.json({
      general: general[0] || {
        total_productos: 0,
        total_piezas: 0,
        valor_total_inventario: 0,
        productos_agotados: 0,
        productos_stock_bajo: 0,
        precio_promedio: 0
      },
      ubicaciones: ubicaciones || [],
      ultimosMovimientos: ultimosMovimientos || []
    });

  } catch (error) {
    console.error('Error en GET inventario:', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}