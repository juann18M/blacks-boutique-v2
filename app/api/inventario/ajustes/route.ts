import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { producto_id, cantidad_nueva, motivo, usuario_id, sucursal_id } = body;

    if (!producto_id || cantidad_nueva === undefined || !motivo || !usuario_id || !sucursal_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Obtener stock actual y datos del producto
    const [producto]: any = await connection.query(
      'SELECT stock, nombre, etiqueta FROM productos WHERE id = ?',
      [producto_id]
    );

    if (producto.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const stockAnterior = producto[0].stock;

    // Registrar ajuste
    const [ajusteResult]: any = await connection.query(
      `INSERT INTO inventario_ajustes 
       (producto_id, cantidad_anterior, cantidad_nueva, motivo, usuario_id, sucursal_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [producto_id, stockAnterior, cantidad_nueva, motivo, usuario_id, sucursal_id]
    );

    // Actualizar stock del producto
    await connection.query(
      'UPDATE productos SET stock = ? WHERE id = ?',
      [cantidad_nueva, producto_id]
    );

    await connection.commit();

    // Obtener el ajuste recién creado con información del usuario
    const [ajusteCompleto]: any = await connection.query(`
      SELECT 
        ia.*,
        p.nombre as producto_nombre,
        p.etiqueta,
        u.nombre as usuario_nombre,
        u.email as usuario_email
      FROM inventario_ajustes ia
      JOIN productos p ON ia.producto_id = p.id
      JOIN usuarios u ON ia.usuario_id = u.id
      WHERE ia.id = ?
    `, [ajusteResult.insertId]);

    return NextResponse.json({
      message: 'Ajuste realizado correctamente',
      ajuste: ajusteCompleto[0],
      producto: producto[0].nombre,
      anterior: stockAnterior,
      nuevo: cantidad_nueva,
      diferencia: cantidad_nueva - stockAnterior
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en POST ajuste:', error);
    return NextResponse.json({ error: 'Error al realizar ajuste' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');

    const [rows]: any = await db.query(`
      SELECT 
        ia.*,
        p.nombre as producto_nombre,
        p.etiqueta,
        u.nombre as usuario_nombre
      FROM inventario_ajustes ia
      JOIN productos p ON ia.producto_id = p.id
      JOIN usuarios u ON ia.usuario_id = u.id
      WHERE ia.sucursal_id = ?
      ORDER BY ia.created_at DESC
      LIMIT 50
    `, [sucursal_id]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error en GET ajustes:', error);
    return NextResponse.json({ error: 'Error al obtener ajustes' }, { status: 500 });
  }
}