import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET - Obtener producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [rows]: any = await db.query(
      `SELECT p.*, u.nombre as usuario_registro_nombre 
       FROM productos p
       LEFT JOIN usuarios u ON p.usuario_registro_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error en GET producto:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT - Actualizar producto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar que el producto existe
    const [existente]: any = await db.query(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const productoActual = existente[0];

    const formData = await request.formData();

    const nombre = formData.get('nombre') as string;
    const color = formData.get('color') as string;
    const talla = formData.get('talla') as string;
    const precio = formData.get('precio') as string;
    const stock = formData.get('stock') as string;
    const ubicacion = formData.get('ubicacion') as string;
    const descripcion = formData.get('descripcion') as string;
    const imagenFile = formData.get('imagen') as File | null;

    if (!nombre || !precio) {
      return NextResponse.json(
        { error: 'Nombre y precio son requeridos' },
        { status: 400 }
      );
    }

    // 🔥 Mantener imagen actual por defecto
    let imagenPath = productoActual.imagen;

    // ✅ SOLO si suben nueva imagen
    if (imagenFile && imagenFile.size > 0) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(imagenFile.type)) {
        return NextResponse.json(
          { error: 'Tipo de archivo no válido' },
          { status: 400 }
        );
      }

      if (imagenFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'La imagen no puede ser mayor a 5MB' },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), 'public/uploads/productos');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // 🔥 AQUÍ SÍ se elimina la anterior (solo si hay nueva)
      if (productoActual.imagen) {
        const oldImagePath = path.join(
          process.cwd(),
          'public',
          productoActual.imagen
        );

        if (existsSync(oldImagePath)) {
          await unlink(oldImagePath).catch(() =>
            console.log('No se pudo eliminar la imagen anterior')
          );
        }
      }

      const bytes = await imagenFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExtension = imagenFile.type.split('/')[1];
      const fileName = `producto_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExtension}`;

      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      imagenPath = `/uploads/productos/${fileName}`;
    }

    // Actualizar producto
    await db.query(
      `UPDATE productos SET 
        nombre = ?, 
        color = ?, 
        talla = ?, 
        precio = ?, 
        stock = ?, 
        ubicacion = ?, 
        imagen = ?, 
        descripcion = ?,
        fecha_actualizacion = NOW()
       WHERE id = ?`,
      [
        nombre,
        color || null,
        talla || null,
        parseFloat(precio),
        parseInt(stock) || 0,
        ubicacion || null,
        imagenPath,
        descripcion || null,
        id
      ]
    );

    const [actualizado]: any = await db.query(
      `SELECT p.*, u.nombre as usuario_registro_nombre 
       FROM productos p
       LEFT JOIN usuarios u ON p.usuario_registro_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    return NextResponse.json({
      message: 'Producto actualizado exitosamente',
      producto: actualizado[0]
    });

  } catch (error) {
    console.error('Error en PUT producto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar producto (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [existente]: any = await db.query(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const producto = existente[0];

    // (opcional) eliminar imagen física
    if (producto.imagen) {
      const imagePath = path.join(process.cwd(), 'public', producto.imagen);
      if (existsSync(imagePath)) {
        await unlink(imagePath).catch(() =>
          console.log('No se pudo eliminar la imagen')
        );
      }
    }

    await db.query(
      'UPDATE productos SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en DELETE producto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}