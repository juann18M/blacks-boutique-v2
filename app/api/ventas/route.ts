import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función para generar folio
async function generarFolio(connection: any): Promise<string> {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const fechaPrefix = `${año}${mes}${dia}`;
  
  // Buscar el último folio del día
  const [rows]: any = await connection.query(
    `SELECT folio FROM ventas 
     WHERE folio LIKE CONCAT('V', ?, '%')
     ORDER BY folio DESC LIMIT 1`,
    [fechaPrefix]
  );
  
  let consecutivo = 1;
  if (rows.length > 0) {
    const ultimoFolio = rows[0].folio;
    const ultimoConsecutivo = parseInt(ultimoFolio.substring(9));
    consecutivo = ultimoConsecutivo + 1;
  }
  
  return `V${fechaPrefix}${String(consecutivo).padStart(4, '0')}`;
}

// POST - Crear nueva venta
export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { 
      productos, 
      metodo_pago, 
      pagos,
      sucursal_id, 
      usuario_id,
      caja_id,
      referenciaTarjeta,
      referenciaTransferencia
    } = body;

    // Validaciones
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
    }

    if (!metodo_pago || !sucursal_id || !usuario_id) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Verificar stock y obtener precios
    let subtotal = 0;
    let iva = 0;
    let total = 0;
    const detalles: any[] = [];

    for (const item of productos) {
      const [productoRows]: any = await db.query(
        'SELECT id, precio, stock FROM productos WHERE id = ? AND activo = true',
        [item.producto_id]
      );

      if (productoRows.length === 0) {
        return NextResponse.json({ error: `Producto ${item.producto_id} no encontrado` }, { status: 400 });
      }

      const producto = productoRows[0];
      
      if (producto.stock < item.cantidad) {
        return NextResponse.json({ error: `Stock insuficiente para producto ${producto.id}` }, { status: 400 });
      }

      const itemSubtotal = Number(producto.precio) * item.cantidad;
      // SIN IVA - comentamos o eliminamos estas líneas
      // const itemIva = itemSubtotal * 0.16;
      // const itemTotal = itemSubtotal + itemIva;
      const itemIva = 0; // IVA en 0
      const itemTotal = itemSubtotal; // Total sin IVA

      subtotal += itemSubtotal;
      iva += itemIva;
      total += itemTotal;

      detalles.push({
        producto_id: producto.id,
        cantidad: item.cantidad,
        precio_unitario: Number(producto.precio),
        subtotal: itemSubtotal,
        iva: itemIva,
        total: itemTotal
      });
    }

    // Validar pagos combinados
    if (metodo_pago === 'combinado') {
      if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        return NextResponse.json({ error: 'Debe especificar los pagos combinados' }, { status: 400 });
      }
      
      const sumaPagos = pagos.reduce((sum: number, p: any) => sum + p.monto, 0);
      if (Math.abs(sumaPagos - total) > 0.01) {
        return NextResponse.json({ 
          error: 'La suma de los pagos no coincide con el total',
          total,
          sumaPagos
        }, { status: 400 });
      }
    }

    // Iniciar transacción
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Generar folio
    const folio = await generarFolio(connection);
    
    // Insertar venta (sin trigger)
    const [ventaResult]: any = await connection.query(
      `INSERT INTO ventas (folio, subtotal, iva, total, metodo_pago, sucursal_id, usuario_id, caja_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completada')`,
      [folio, subtotal, iva, total, metodo_pago, sucursal_id, usuario_id, caja_id || null]
    );

    const ventaId = ventaResult.insertId;

    // Insertar detalles y actualizar stock
    for (const detalle of detalles) {
      await connection.query(
        `INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal, iva, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ventaId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, 
         detalle.subtotal, detalle.iva, detalle.total]
      );

      await connection.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [detalle.cantidad, detalle.producto_id]
      );
    }

    // Insertar pagos
    if (metodo_pago === 'combinado' && pagos) {
      for (const pago of pagos) {
        await connection.query(
          `INSERT INTO venta_pagos (venta_id, metodo, monto, referencia)
           VALUES (?, ?, ?, ?)`,
          [ventaId, pago.metodo, pago.monto, pago.referencia || null]
        );
      }
    } else {
      let referencia = null;
      if (metodo_pago === 'tarjeta' && referenciaTarjeta) {
        referencia = referenciaTarjeta;
      } else if (metodo_pago === 'transferencia' && referenciaTransferencia) {
        referencia = referenciaTransferencia;
      }
      
      await connection.query(
        `INSERT INTO venta_pagos (venta_id, metodo, monto, referencia)
         VALUES (?, ?, ?, ?)`,
        [ventaId, metodo_pago, total, referencia]
      );
    }

   // Actualizar caja (separado por métodos de pago)
if (caja_id) {

  if (metodo_pago === 'combinado' && pagos) {
    for (const pago of pagos) {

      if (pago.metodo === 'efectivo') {
        await connection.query(
          `UPDATE caja 
           SET monto_actual = monto_actual + ?, efectivo = efectivo + ?
           WHERE id = ?`,
          [pago.monto, pago.monto, caja_id]
        );
      }

      if (pago.metodo === 'tarjeta') {
        await connection.query(
          `UPDATE caja 
           SET monto_actual = monto_actual + ?, tarjeta = tarjeta + ?
           WHERE id = ?`,
          [pago.monto, pago.monto, caja_id]
        );
      }

      if (pago.metodo === 'transferencia') {
        await connection.query(
          `UPDATE caja 
           SET monto_actual = monto_actual + ?, transferencia = transferencia + ?
           WHERE id = ?`,
          [pago.monto, pago.monto, caja_id]
        );
      }
    }

  } else {

    if (metodo_pago === 'efectivo') {
      await connection.query(
        `UPDATE caja 
         SET monto_actual = monto_actual + ?, efectivo = efectivo + ?
         WHERE id = ?`,
        [total, total, caja_id]
      );
    }

    if (metodo_pago === 'tarjeta') {
      await connection.query(
        `UPDATE caja 
         SET monto_actual = monto_actual + ?, tarjeta = tarjeta + ?
         WHERE id = ?`,
        [total, total, caja_id]
      );
    }

    if (metodo_pago === 'transferencia') {
      await connection.query(
        `UPDATE caja 
         SET monto_actual = monto_actual + ?, transferencia = transferencia + ?
         WHERE id = ?`,
        [total, total, caja_id]
      );
    }

  }
}

    await connection.commit();

    // Obtener la venta completa
    const [ventaRows]: any = await connection.query(
      `SELECT v.*, s.nombre as sucursal_nombre, u.nombre as usuario_nombre
       FROM ventas v
       LEFT JOIN sucursales s ON v.sucursal_id = s.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [ventaId]
    );

    const [detallesRows]: any = await connection.query(
      `SELECT vd.*, p.nombre as producto_nombre, p.etiqueta as producto_etiqueta,
              p.color, p.talla
       FROM venta_detalles vd
       LEFT JOIN productos p ON vd.producto_id = p.id
       WHERE vd.venta_id = ?`,
      [ventaId]
    );
    
    const [pagosRows]: any = await connection.query(
      `SELECT * FROM venta_pagos WHERE venta_id = ?`,
      [ventaId]
    );

    const venta = {
      ...ventaRows[0],
      productos: detallesRows,
      pagos: pagosRows
    };

    return NextResponse.json({
      message: 'Venta registrada exitosamente',
      venta
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST ventas:', error);
    if (connection) {
      await connection.rollback();
    }
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// GET - Obtener ventas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
    const fecha = searchParams.get('fecha');
    const folio = searchParams.get('folio');

    let query = `
      SELECT v.*, s.nombre as sucursal_nombre, u.nombre as usuario_nombre
      FROM ventas v
      LEFT JOIN sucursales s ON v.sucursal_id = s.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];

    if (sucursal_id) {
      query += ` AND v.sucursal_id = ?`;
      values.push(sucursal_id);
    }

    if (fecha) {
      query += ` AND DATE(v.fecha) = ?`;
      values.push(fecha);
    }

    if (folio) {
      query += ` AND v.folio = ?`;
      values.push(folio);
    }

    query += ` ORDER BY v.fecha DESC LIMIT 50`;

    const [rows]: any = await db.query(query, values);
    
    // Obtener detalles para cada venta
    const ventas = await Promise.all(rows.map(async (row: any) => {
      const [detalles]: any = await db.query(
        `SELECT vd.*, p.nombre as producto_nombre, p.etiqueta as producto_etiqueta,
                p.color, p.talla
         FROM venta_detalles vd
         LEFT JOIN productos p ON vd.producto_id = p.id
         WHERE vd.venta_id = ?`,
        [row.id]
      );
      
      const [pagos]: any = await db.query(
        `SELECT * FROM venta_pagos WHERE venta_id = ?`,
        [row.id]
      );
      
      return {
        ...row,
        productos: detalles,
        pagos: pagos
      };
    }));

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error en GET ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// DELETE - Cancelar venta
export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de venta requerido' }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Obtener detalles de la venta
    const [ventaRows]: any = await connection.query(
      'SELECT * FROM ventas WHERE id = ? AND estado = "completada"',
      [id]
    );

    if (ventaRows.length === 0) {
      return NextResponse.json({ error: 'Venta no encontrada o ya cancelada' }, { status: 404 });
    }

    const venta = ventaRows[0];

    // Restaurar stock
    const [detalles]: any = await connection.query(
      'SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?',
      [id]
    );

    for (const detalle of detalles) {
      await connection.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?',
        [detalle.cantidad, detalle.producto_id]
      );
    }

    // Restar de caja
    if (venta.caja_id) {
      await connection.query(
        'UPDATE caja SET monto_actual = monto_actual - ? WHERE id = ?',
        [venta.total, venta.caja_id]
      );
    }

    // Marcar venta como cancelada
    await connection.query(
      'UPDATE ventas SET estado = "cancelada" WHERE id = ?',
      [id]
    );

    await connection.commit();

    return NextResponse.json({ message: 'Venta cancelada exitosamente' });

  } catch (error) {
    console.error('Error en DELETE ventas:', error);
    if (connection) {
      await connection.rollback();
    }
    return NextResponse.json({ error: 'Error al cancelar venta' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}