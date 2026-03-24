import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* ======================
   GET
====================== */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
let query = `
  SELECT 
    t.*,
    p.nombre as producto_nombre,
    p.etiqueta,
    p.imagen,
    so.nombre as sucursal_origen_nombre,
    sd.nombre as sucursal_destino_nombre,
    u.nombre as usuario_nombre
  FROM traslados t
  JOIN productos p ON t.producto_id = p.id
  JOIN sucursales so ON t.sucursal_origen_id = so.id
  JOIN sucursales sd ON t.sucursal_destino_id = sd.id
  JOIN usuarios u ON t.usuario_id = u.id
  WHERE 1=1
`;
    
    const values: any[] = [];

    if (sucursal_id) {
      query += ` AND (t.sucursal_origen_id = ? OR t.sucursal_destino_id = ?)`;
      values.push(sucursal_id, sucursal_id);
    }

    query += ` ORDER BY t.created_at DESC LIMIT 100`;

    const [rows] = await db.query(query, values);
    return NextResponse.json(rows);

  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener traslados' }, { status: 500 });
  }
}

/* ======================
   POST
====================== */
export async function POST(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    const { producto_id, cantidad, sucursal_origen_id, sucursal_destino_id, usuario_id, motivo } = body;

    if (!producto_id || !cantidad || !sucursal_origen_id || !sucursal_destino_id || !usuario_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (sucursal_origen_id === sucursal_destino_id) {
      return NextResponse.json({ error: 'Las sucursales deben ser diferentes' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* ======================
       VALIDAR STOCK ORIGEN
    ====================== */
    const [productoOrigen]: any = await connection.query(
      'SELECT * FROM productos WHERE id = ? AND sucursal_id = ?',
      [producto_id, sucursal_origen_id]
    );

    if (productoOrigen.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Producto no encontrado en origen' }, { status: 404 });
    }

    if (productoOrigen[0].stock < cantidad) {
      await connection.rollback();
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    const p = productoOrigen[0];

    /* ======================
       BUSCAR O CREAR PRODUCTO EN DESTINO (POR ETIQUETA)
    ====================== */
    const [productoDestino]: any = await connection.query(
      `SELECT id, stock FROM productos 
       WHERE etiqueta = ? AND sucursal_id = ?`,
      [p.etiqueta, sucursal_destino_id]
    );

    let productoDestinoId;

    /* ======================
       SI NO EXISTE EN DESTINO → CREARLO
    ====================== */
    if (productoDestino.length === 0) {
      const [insert]: any = await connection.query(
        `INSERT INTO productos 
        (etiqueta, nombre, color, talla, precio, stock, ubicacion, imagen, descripcion, sucursal_id, usuario_registro_id)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          p.etiqueta,
          p.nombre,
          p.color,
          p.talla,
          p.precio,
          p.ubicacion,
          p.imagen,
          p.descripcion,
          sucursal_destino_id,
          usuario_id
        ]
      );
      productoDestinoId = insert.insertId;
      console.log('✅ Producto creado en destino con ID:', productoDestinoId);
    } else {
      productoDestinoId = productoDestino[0].id;
      console.log('✅ Producto encontrado en destino con ID:', productoDestinoId);
    }

    /* ======================
       RESTAR STOCK ORIGEN
    ====================== */
    await connection.query(
      'UPDATE productos SET stock = stock - ? WHERE id = ?',
      [cantidad, producto_id]
    );

    /* ======================
       SUMAR STOCK DESTINO
    ====================== */
    await connection.query(
      'UPDATE productos SET stock = stock + ? WHERE id = ?',
      [cantidad, productoDestinoId]
    );

    /* ======================
       VERIFICAR QUE LOS STOCKS SE ACTUALIZARON CORRECTAMENTE
    ====================== */
    const [verificarOrigen]: any = await connection.query(
      'SELECT stock FROM productos WHERE id = ?',
      [producto_id]
    );
    
    const [verificarDestino]: any = await connection.query(
      'SELECT stock FROM productos WHERE id = ?',
      [productoDestinoId]
    );

    console.log('✅ Stock origen después:', verificarOrigen[0].stock);
    console.log('✅ Stock destino después:', verificarDestino[0].stock);

    /* ======================
       REGISTRAR TRASLADO (SIN producto_destino_id)
    ====================== */
    // generar folio
const folio = `TR-${Date.now()}`;

const [result]: any = await connection.query(
  `INSERT INTO traslados 
  (folio, producto_id, cantidad, sucursal_origen_id, sucursal_destino_id, usuario_id, motivo)
  VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [folio, producto_id, cantidad, sucursal_origen_id, sucursal_destino_id, usuario_id, motivo || null]
);
    await connection.commit();

    /* ======================
       DEVOLVER TRASLADO CON INFORMACIÓN COMPLETA
    ====================== */
    const [traslado]: any = await connection.query(`
      SELECT 
        t.*,
        p.nombre as producto_nombre,
        p.etiqueta,
        so.nombre as sucursal_origen_nombre,
        sd.nombre as sucursal_destino_nombre,
        u.nombre as usuario_nombre
      FROM traslados t
      JOIN productos p ON t.producto_id = p.id
      JOIN sucursales so ON t.sucursal_origen_id = so.id
      JOIN sucursales sd ON t.sucursal_destino_id = sd.id
      JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.id = ?
    `, [result.insertId]);

    return NextResponse.json({
      message: 'Traslado realizado exitosamente',
      traslado: traslado[0],
      stocks: {
        origen: verificarOrigen[0].stock,
        destino: verificarDestino[0].stock
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error detallado:', error);
    return NextResponse.json(
      { error: 'Error al realizar traslado: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}