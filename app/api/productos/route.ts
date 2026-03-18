import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Función para generar etiqueta aleatoria
function generarEtiqueta(longitud: number = 8): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let etiqueta = '';
  for (let i = 0; i < longitud; i++) {
    etiqueta += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return etiqueta;
}

// GET - Obtener productos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');
    const search = searchParams.get('search');

    let query = `
      SELECT p.*, u.nombre as usuario_registro_nombre 
      FROM productos p
      LEFT JOIN usuarios u ON p.usuario_registro_id = u.id
      WHERE p.activo = TRUE
    `;
    const values: any[] = [];

    if (sucursal_id) {
      query += ` AND p.sucursal_id = ?`;
      values.push(sucursal_id);
    }

    if (search) {
      query += ` AND (p.nombre LIKE ? OR p.etiqueta LIKE ? OR p.descripcion LIKE ?)`;
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY p.fecha_registro DESC`;

    const [rows] = await db.query(query, values);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error en GET productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST - Crear nuevo producto con imagen
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const nombre = formData.get('nombre') as string;
    const color = formData.get('color') as string;
    const talla = formData.get('talla') as string;
    const precio = formData.get('precio') as string;
    const stock = formData.get('stock') as string;
    const ubicacion = formData.get('ubicacion') as string;
    const descripcion = formData.get('descripcion') as string;
    const sucursal_id = formData.get('sucursal_id') as string;
    const usuario_registro_id = formData.get('usuario_registro_id') as string;
    const imagenFile = formData.get('imagen') as File | null;

    if (!nombre || !precio || !sucursal_id || !usuario_registro_id) {
      return NextResponse.json({ 
        error: 'Nombre, precio, sucursal_id y usuario_registro_id son requeridos' 
      }, { status: 400 });
    }

    let imagenPath = null;

    if (imagenFile && imagenFile.size > 0) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(imagenFile.type)) {
        return NextResponse.json({ 
          error: 'Tipo de archivo no válido. Solo se permiten JPEG, PNG y WEBP' 
        }, { status: 400 });
      }

      if (imagenFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ 
          error: 'La imagen no puede ser mayor a 5MB' 
        }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public/uploads/productos');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const bytes = await imagenFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileExtension = imagenFile.type.split('/')[1];
      const fileName = `producto_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      
      imagenPath = `/uploads/productos/${fileName}`;
    }

    // Generar etiqueta única
    let etiqueta = generarEtiqueta();
    let existe = true;
    let intentos = 0;
    const maxIntentos = 10;

    while (existe && intentos < maxIntentos) {
      const [rows]: any = await db.query(
        'SELECT id FROM productos WHERE etiqueta = ?',
        [etiqueta]
      );
      
      if (rows.length === 0) {
        existe = false;
      } else {
        etiqueta = generarEtiqueta();
        intentos++;
      }
    }

    if (existe) {
      return NextResponse.json({ 
        error: 'No se pudo generar una etiqueta única' 
      }, { status: 500 });
    }

    const [result]: any = await db.query(
      `INSERT INTO productos (
        etiqueta, nombre, color, talla, precio, stock, 
        ubicacion, imagen, descripcion, sucursal_id, usuario_registro_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        etiqueta, 
        nombre, 
        color || null, 
        talla || null, 
        parseFloat(precio), 
        parseInt(stock) || 0,
        ubicacion || null, 
        imagenPath,
        descripcion || null, 
        parseInt(sucursal_id), 
        parseInt(usuario_registro_id)
      ]
    );

    const [nuevoProducto]: any = await db.query(
      `SELECT p.*, u.nombre as usuario_registro_nombre 
       FROM productos p
       LEFT JOIN usuarios u ON p.usuario_registro_id = u.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    return NextResponse.json({
      message: 'Producto creado exitosamente',
      producto: nuevoProducto[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST productos:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}