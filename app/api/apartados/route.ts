import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enviarMensajeWhatsApp, plantillas } from '@/lib/whatsapp';

// Función para generar folio
async function generarFolioApartado(connection: any): Promise<string> {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const fechaPrefix = `${año}${mes}${dia}`;
  
  const [rows]: any = await connection.query(
    `SELECT folio FROM apartados 
     WHERE folio LIKE CONCAT('AP', ? , '%') 
     ORDER BY folio DESC LIMIT 1`,
    [fechaPrefix]
  );
  
  let consecutivo = 1;
  if (rows.length > 0) {
    const ultimoFolio = rows[0].folio;
    const ultimoConsecutivo = parseInt(ultimoFolio.substring(10));
    consecutivo = ultimoConsecutivo + 1;
  }
  
  return `AP${fechaPrefix}${String(consecutivo).padStart(4, '0')}`;
}

// GET - Obtener apartados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
    const estado = searchParams.get('estado');
    const cliente_id = searchParams.get('cliente_id');

    let query = `
      SELECT 
        a.*,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        p.nombre as producto_nombre,
        p.etiqueta as producto_etiqueta,
        p.imagen as producto_imagen,
        u.nombre as usuario_nombre
      FROM apartados a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN productos p ON a.producto_id = p.id
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];

    if (sucursal_id) {
      query += ` AND a.sucursal_id = ?`;
      values.push(sucursal_id);
    }

    if (estado) {
      query += ` AND a.estado = ?`;
      values.push(estado);
    }

    if (cliente_id) {
      query += ` AND a.cliente_id = ?`;
      values.push(cliente_id);
    }

    query += ` ORDER BY a.created_at DESC`;

    const [rows] = await db.query(query, values);
    return NextResponse.json(rows);

  } catch (error) {
    console.error('Error en GET apartados:', error);
    return NextResponse.json({ error: 'Error al obtener apartados' }, { status: 500 });
  }
}

// POST - Crear nuevo apartado
export async function POST(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    const { 
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      cliente_direccion,
      producto_id,
      cantidad,
      anticipo,
      anticipo_metodo, // NUEVO
      notas,
      usuario_id,
      sucursal_id
    } = body;

    if (!cliente_nombre || !cliente_telefono || !producto_id || !cantidad || !usuario_id || !sucursal_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Verificar producto y stock
    const [producto]: any = await connection.query(
      'SELECT * FROM productos WHERE id = ? AND sucursal_id = ?',
      [producto_id, sucursal_id]
    );

    if (producto.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (producto[0].stock < cantidad) {
      return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
    }

    const p = producto[0];
    const total = Number(p.precio) * cantidad;
    const anticipoNum = Number(anticipo) || 0;
    const saldo = total - anticipoNum;

    if (saldo < 0) {
      return NextResponse.json({ error: 'El anticipo no puede ser mayor al total' }, { status: 400 });
    }

    // 2. Buscar o crear cliente
    let clienteId;
    const [clienteExistente]: any = await connection.query(
      'SELECT id FROM clientes WHERE telefono = ?',
      [cliente_telefono]
    );

    if (clienteExistente.length > 0) {
      clienteId = clienteExistente[0].id;
      
      await connection.query(
        'UPDATE clientes SET nombre = ?, email = ?, direccion = ? WHERE id = ?',
        [cliente_nombre, cliente_email || null, cliente_direccion || null, clienteId]
      );
    } else {
      const [insert]: any = await connection.query(
        `INSERT INTO clientes (nombre, telefono, email, direccion)
         VALUES (?, ?, ?, ?)`,
        [cliente_nombre, cliente_telefono, cliente_email || null, cliente_direccion || null]
      );
      clienteId = insert.insertId;
    }

    // 3. Generar folio
    const folio = await generarFolioApartado(connection);

    // 4. Calcular fecha límite (30 días después)
    const fechaActual = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    const fechaActualStr = fechaActual.toISOString().split('T')[0];

    // 5. Crear apartado
    const [apartadoResult]: any = await connection.query(
      `INSERT INTO apartados 
       (folio, cliente_id, producto_id, cantidad, precio_apartado, anticipo, anticipo_metodo, saldo_pendiente, 
        fecha_apartado, fecha_limite, notas, usuario_id, sucursal_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folio,
        clienteId,
        producto_id,
        cantidad,
        p.precio,
        anticipoNum,
        anticipo_metodo || 'efectivo',
        saldo,
        fechaActualStr,
        fechaLimiteStr,
        notas || null,
        usuario_id,
        sucursal_id,
        'activo'
      ]
    );

    // 6. Restar stock
    await connection.query(
      'UPDATE productos SET stock = stock - ? WHERE id = ?',
      [cantidad, producto_id]
    );

    // 7. Si hay anticipo, registrar el pago y actualizar caja
    if (anticipoNum > 0) {
      await connection.query(
        `INSERT INTO apartados_pagos (apartado_id, monto, metodo_pago, usuario_id)
         VALUES (?, ?, ?, ?)`,
        [apartadoResult.insertId, anticipoNum, anticipo_metodo || 'efectivo', usuario_id]
      );

      // Actualizar caja (si está abierta)
      const [cajaActiva]: any = await connection.query(
        'SELECT id FROM caja WHERE sucursal_id = ? AND estado = "abierta" ORDER BY id DESC LIMIT 1',
        [sucursal_id]
      );

      if (cajaActiva.length > 0) {
        await connection.query(
          'UPDATE caja SET monto_actual = monto_actual + ? WHERE id = ?',
          [anticipoNum, cajaActiva[0].id]
        );
      }
    }

    await connection.commit();

    // 8. Obtener el apartado completo
    const [apartado]: any = await connection.query(`
      SELECT a.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             p.nombre as producto_nombre, p.etiqueta as producto_etiqueta
      FROM apartados a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN productos p ON a.producto_id = p.id
      WHERE a.id = ?
    `, [apartadoResult.insertId]);

    // 9. Enviar mensaje de WhatsApp
    const mensaje = plantillas.apartadoCreado(
      cliente_nombre,
      folio,
      p.nombre,
      cantidad,
      fechaLimite.toLocaleDateString('es-MX'),
      anticipoNum,
      anticipo_metodo || 'efectivo',
      saldo,
      total
    );

    const whatsappResult = await enviarMensajeWhatsApp(cliente_telefono, mensaje);

    return NextResponse.json({
      message: 'Apartado creado exitosamente',
      apartado: apartado[0],
      whatsapp: whatsappResult
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en POST apartado:', error);
    return NextResponse.json(
      { error: 'Error al crear apartado' },
      { status: 500 }
    );

  } finally {
    if (connection) connection.release();
  }
}

// PUT - Liquidar apartado (abonos)
export async function PUT(request: NextRequest) {
  let connection;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { monto, metodo_pago, referencia, usuario_id } = body;

    if (!id || !monto || !metodo_pago || !usuario_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Obtener apartado
    const [apartado]: any = await connection.query(
      `SELECT a.*, c.nombre as cliente_nombre, c.telefono, 
              p.nombre as producto_nombre, p.precio
       FROM apartados a
       JOIN clientes c ON a.cliente_id = c.id
       JOIN productos p ON a.producto_id = p.id
       WHERE a.id = ?`,
      [id]
    );

    if (apartado.length === 0) {
      return NextResponse.json({ error: 'Apartado no encontrado' }, { status: 404 });
    }

    const a = apartado[0];

    if (a.estado !== 'activo') {
      return NextResponse.json({ error: 'El apartado no está activo' }, { status: 400 });
    }

    const saldoAnterior = Number(a.saldo_pendiente);
    const montoNum = Number(monto);
    const nuevoSaldo = saldoAnterior - montoNum;

    if (nuevoSaldo < 0) {
      return NextResponse.json({ error: 'El monto excede el saldo pendiente' }, { status: 400 });
    }

    // Registrar pago
    await connection.query(
      `INSERT INTO apartados_pagos (apartado_id, monto, metodo_pago, referencia, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, montoNum, metodo_pago, referencia || null, usuario_id]
    );

    // Actualizar caja
    const [cajaActiva]: any = await connection.query(
      'SELECT id FROM caja WHERE sucursal_id = ? AND estado = "abierta" ORDER BY id DESC LIMIT 1',
      [a.sucursal_id]
    );

    if (cajaActiva.length > 0) {
      await connection.query(
        'UPDATE caja SET monto_actual = monto_actual + ? WHERE id = ?',
        [montoNum, cajaActiva[0].id]
      );
    }

    // Actualizar saldo y estado
    if (nuevoSaldo === 0) {
      await connection.query(
        `UPDATE apartados SET saldo_pendiente = 0, estado = 'completado' WHERE id = ?`,
        [id]
      );

      const mensaje = plantillas.apartadoCompletado(
        a.cliente_nombre,
        a.folio,
        a.producto_nombre
      );
      await enviarMensajeWhatsApp(a.telefono, mensaje);

    } else {
      await connection.query(
        `UPDATE apartados SET saldo_pendiente = ? WHERE id = ?`,
        [nuevoSaldo, id]
      );

      // Enviar mensaje de abono
      const fechaLimite = new Date(a.fecha_limite).toLocaleDateString('es-MX');
      const mensaje = plantillas.abonoRegistrado(
        a.cliente_nombre,
        a.folio,
        a.producto_nombre,
        montoNum,
        metodo_pago,
        saldoAnterior,
        nuevoSaldo,
        fechaLimite
      );
      await enviarMensajeWhatsApp(a.telefono, mensaje);
    }

    await connection.commit();

    return NextResponse.json({
      message: nuevoSaldo === 0 ? 'Apartado liquidado' : 'Abono registrado',
      saldo_restante: nuevoSaldo
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en PUT apartado:', error);
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });

  } finally {
    if (connection) connection.release();
  }
}

// DELETE - Cancelar apartado
export async function DELETE(request: NextRequest) {
  let connection;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const usuario_id = searchParams.get('usuario_id');

    if (!id || !usuario_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [apartado]: any = await connection.query(
      `SELECT a.*, c.nombre as cliente_nombre, c.telefono,
              p.nombre as producto_nombre
       FROM apartados a
       JOIN clientes c ON a.cliente_id = c.id
       JOIN productos p ON a.producto_id = p.id
       WHERE a.id = ?`,
      [id]
    );

    if (apartado.length === 0) {
      return NextResponse.json({ error: 'Apartado no encontrado' }, { status: 404 });
    }

    const a = apartado[0];

    // Devolver stock
    await connection.query(
      'UPDATE productos SET stock = stock + ? WHERE id = ?',
      [a.cantidad, a.producto_id]
    );

    // Cancelar apartado
    await connection.query(
      `UPDATE apartados SET estado = 'cancelado' WHERE id = ?`,
      [id]
    );

    await connection.commit();

    return NextResponse.json({ message: 'Apartado cancelado' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en DELETE apartado:', error);
    return NextResponse.json({ error: 'Error al cancelar apartado' }, { status: 500 });

  } finally {
    if (connection) connection.release();
  }
}