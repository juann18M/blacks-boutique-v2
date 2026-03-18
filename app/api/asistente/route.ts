import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { mensaje, sucursal_id, usuario_id } = await request.json();

    if (!mensaje) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const consulta = mensaje.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // ===========================================
    // PRIMERO: OBTENER TODAS LAS SUCURSALES DE LA BD
    // ===========================================
    const [todasSucursales]: any = await db.query('SELECT id, nombre FROM sucursales');
    
    // Crear mapa dinámico de sucursales
    const sucursalesMap: { [key: string]: string } = {};
    todasSucursales.forEach((s: any) => {
      const nombreLimpio = s.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      sucursalesMap[nombreLimpio] = s.id.toString();
      
      // También agregar variantes comunes
      if (s.nombre.includes('Isidro Huarte')) {
        const numero = s.nombre.match(/\d+/)?.[0] || '1';
        sucursalesMap[`isidro huarte ${numero}`] = s.id.toString();
        sucursalesMap[`ihuarte ${numero}`] = s.id.toString();
        sucursalesMap[`sucursal ${numero}`] = s.id.toString();
      }
      
      if (s.nombre.includes('Guadalupe Victoria')) {
        const numero = s.nombre.match(/\d+/)?.[0] || '1';
        sucursalesMap[`guadalupe victoria ${numero}`] = s.id.toString();
        sucursalesMap[`gpe victoria ${numero}`] = s.id.toString();
        sucursalesMap[`victoria ${numero}`] = s.id.toString();
      }
      
      if (s.nombre.includes('Santiago Tapia')) {
        const numero = s.nombre.match(/\d+/)?.[0] || '1';
        sucursalesMap[`santiago tapia ${numero}`] = s.id.toString();
        sucursalesMap[`santiago ${numero}`] = s.id.toString();
        sucursalesMap[`tapia ${numero}`] = s.id.toString();
      }
    });

    console.log('🗺️ Mapa de sucursales:', sucursalesMap);

    // ===========================================
    // DETECTAR SUCURSAL MENCIONADA
    // ===========================================
    let sucursalBusqueda = sucursal_id; // Por defecto la sucursal activa
    let mensajeSinSucursal = consulta;
    let sucursalMencionada = '';
    let nombreSucursalEncontrada = '';

    // Buscar si menciona alguna sucursal conocida
    for (const [nombre, id] of Object.entries(sucursalesMap)) {
      if (consulta.includes(nombre)) {
        sucursalBusqueda = id;
        mensajeSinSucursal = consulta.replace(nombre, '').trim();
        sucursalMencionada = nombre;
        
        // Obtener nombre original de la sucursal
        const [sucInfo]: any = await db.query('SELECT nombre FROM sucursales WHERE id = ?', [id]);
        nombreSucursalEncontrada = sucInfo[0]?.nombre || nombre;
        break;
      }
    }

    // Si no se mencionó ninguna sucursal específica, usar la activa
    if (!sucursalMencionada) {
      const [sucInfo]: any = await db.query('SELECT nombre FROM sucursales WHERE id = ?', [sucursal_id]);
      nombreSucursalEncontrada = sucInfo[0]?.nombre || 'tu sucursal';
    }

    console.log('📍 Sucursal detectada:', { sucursalBusqueda, nombre: nombreSucursalEncontrada, mensaje: mensajeSinSucursal });

    // ===========================================
    // DETECTAR CONSULTA DE STOCK BAJO
    // ===========================================
    if (consulta.includes('poco stock') || consulta.includes('stock bajo') || consulta.includes('agotando')) {
      const [bajoStock]: any = await db.query(`
        SELECT p.*, s.nombre as sucursal_nombre
        FROM productos p
        JOIN sucursales s ON p.sucursal_id = s.id
        WHERE p.activo = true AND p.stock > 0 AND p.stock <= 3
        AND p.sucursal_id = ?
        ORDER BY p.stock ASC
        LIMIT 10
      `, [sucursalBusqueda]);

      if (bajoStock.length > 0) {
        return NextResponse.json({
          tipo: 'productos_sucursal',
          titulo: `⚠️ Productos con stock bajo en *${nombreSucursalEncontrada}*:`,
          productos: bajoStock
        });
      } else {
        return NextResponse.json({
          tipo: 'texto',
          mensaje: `🎉 ¡Excelente! No hay productos con stock bajo en *${nombreSucursalEncontrada}*.`
        });
      }
    }

    // ===========================================
// DETECTAR AGRADECIMIENTOS Y DESPEDIDAS
// ===========================================
const agradecimientos = ['gracias', 'thanks', 'thank you', 'te agradezco', 'muchas gracias'];
const despedidas = ['adios', 'bye', 'hasta luego', 'nos vemos', 'cuidate'];

if (agradecimientos.some(a => consulta.includes(a))) {
  return NextResponse.json({
    tipo: 'texto',
    mensaje: '¡De nada! 😊 Estoy aquí para ayudarte cuando lo necesites.'
  });
}

if (despedidas.some(d => consulta.includes(d))) {
  return NextResponse.json({
    tipo: 'texto',
    mensaje: '¡Hasta luego! Que tengas un excelente día. 👋'
  });
}

    // ===========================================
    // SI SOLO MENCIONÓ UNA SUCURSAL (sin búsqueda específica)
    // ===========================================
    if (sucursalMencionada && mensajeSinSucursal.length < 3) {
      const [productosSucursal]: any = await db.query(`
        SELECT p.*, s.nombre as sucursal_nombre
        FROM productos p
        JOIN sucursales s ON p.sucursal_id = s.id
        WHERE p.activo = true AND p.stock > 0 AND p.sucursal_id = ?
        ORDER BY p.stock DESC
        LIMIT 8
      `, [sucursalBusqueda]);

      if (productosSucursal.length > 0) {
        return NextResponse.json({
          tipo: 'productos_sucursal',
          titulo: `📦 Productos disponibles en *${nombreSucursalEncontrada}*:`,
          productos: productosSucursal
        });
      } else {
        return NextResponse.json({
          tipo: 'texto',
          mensaje: `😕 No hay productos disponibles en *${nombreSucursalEncontrada}* en este momento.`
        });
      }
    }

    // ===========================================
    // BUSCAR POR ETIQUETA (#CODIGO)
    // ===========================================
    const matchEtiqueta = consulta.match(/#([a-z0-9]+)/i);
    if (matchEtiqueta) {
      const etiqueta = matchEtiqueta[1].toUpperCase();
      
      const [productos]: any = await db.query(`
        SELECT p.*, s.nombre as sucursal_nombre
        FROM productos p
        JOIN sucursales s ON p.sucursal_id = s.id
        WHERE p.etiqueta = ? AND p.activo = true
      `, [etiqueta]);

      if (productos.length > 0) {
        return NextResponse.json({
          tipo: 'producto_unico',
          producto: productos[0]
        });
      } else {
        return NextResponse.json({
          tipo: 'texto',
          mensaje: `🔍 No encontré ningún producto con la etiqueta **#${etiqueta}**`
        });
      }
    }

    // ===========================================
    // BUSCAR PRODUCTOS POR NOMBRE/CARACTERÍSTICAS
    // ===========================================
    
    // Extraer palabras clave (ignorar palabras comunes)
    const palabrasIgnorar = [
      'que', 'como', 'para', 'con', 'una', 'unos', 'unas', 'tienes', 'hay', 
      'busco', 'donde', 'cual', 'cuando', 'este', 'esta', 'estos', 'estas',
      'pero', 'porque', 'asi', 'favor', 'ver', 'dame', 'muestrame', 'quiero',
      'necesito', 'podrias', 'puedes', 'ayuda', 'ayudame', 'me', 'te', 'se',
      'algun', 'alguna', 'algunos', 'algunas', 'todos', 'todas'
    ];

    const palabras = mensajeSinSucursal.split(' ')
  .map((p: string) => p.trim())
  .filter((p: string) => p.length > 2)
  .filter((p: string) => !palabrasIgnorar.includes(p))
  .filter((p: string) => !Object.keys(sucursalesMap).some(s => p.includes(s)));

    console.log('🔍 Buscando:', { palabras, sucursal: sucursalBusqueda, sucursalNombre: nombreSucursalEncontrada });

    // Si no hay palabras clave, mostrar productos de la sucursal
    if (palabras.length === 0) {
      const [destacados]: any = await db.query(`
        SELECT p.*, s.nombre as sucursal_nombre
        FROM productos p
        JOIN sucursales s ON p.sucursal_id = s.id
        WHERE p.activo = true AND p.stock > 0 AND p.sucursal_id = ?
        ORDER BY p.stock DESC
        LIMIT 8
      `, [sucursalBusqueda]);

      if (destacados.length > 0) {
        return NextResponse.json({
          tipo: 'productos_sucursal',
          titulo: `📦 Productos disponibles en *${nombreSucursalEncontrada}*:`,
          productos: destacados
        });
      }
    }

    // Construir búsqueda
    let query = `
      SELECT p.*, s.nombre as sucursal_nombre
      FROM productos p
      JOIN sucursales s ON p.sucursal_id = s.id
      WHERE p.activo = true AND p.stock > 0
    `;
    const values: any[] = [];

    // Filtrar por sucursal
    query += ` AND p.sucursal_id = ?`;
    values.push(sucursalBusqueda);

    // Buscar por palabras clave
    if (palabras.length > 0) {
      query += ` AND (`;
      const condiciones: string[] = [];
      
      palabras.forEach((palabra: string) => {
        condiciones.push(`p.nombre LIKE ?`);
        condiciones.push(`p.color LIKE ?`);
        condiciones.push(`p.talla LIKE ?`);
        condiciones.push(`p.descripcion LIKE ?`);
        values.push(`%${palabra}%`, `%${palabra}%`, `%${palabra}%`, `%${palabra}%`);
      });
      
      query += condiciones.join(' OR ');
      query += `)`;
    }

    query += ` ORDER BY p.stock DESC LIMIT 15`;

    const [productos]: any = await db.query(query, values);

    if (productos.length === 0) {
      // Productos destacados de la sucursal
      const [destacados]: any = await db.query(`
        SELECT p.*, s.nombre as sucursal_nombre
        FROM productos p
        JOIN sucursales s ON p.sucursal_id = s.id
        WHERE p.activo = true AND p.stock > 0 AND p.sucursal_id = ?
        ORDER BY p.stock DESC
        LIMIT 5
      `, [sucursalBusqueda]);

      if (destacados.length > 0) {
        const busquedaUsuario = palabras.join(' ') || 'ese producto';
        return NextResponse.json({
          tipo: 'productos_sucursal',
          titulo: `🔍 En *${nombreSucursalEncontrada}* no encontré "${busquedaUsuario}"`,
          subtitulo: 'Pero tengo estos productos disponibles:',
          productos: destacados
        });
      }

      return NextResponse.json({
        tipo: 'texto',
        mensaje: `😕 En *${nombreSucursalEncontrada}* no hay productos que coincidan con tu búsqueda.`
      });
    }

    // Productos encontrados
    if (productos.length === 1) {
      return NextResponse.json({
        tipo: 'producto_unico',
        producto: productos[0]
      });
    } else {
      const busquedaUsuario = palabras.join(' ') || 'productos';
      return NextResponse.json({
        tipo: 'productos_sucursal',
        titulo: `📦 En *${nombreSucursalEncontrada}* encontré ${productos.length} productos:`,
        productos: productos
      });
    }

  } catch (error) {
    console.error('Error en asistente:', error);
    return NextResponse.json(
      { 
        tipo: 'texto',
        mensaje: '❌ Lo siento, tuve un problema interno. ¿Puedes intentarlo de nuevo?' 
      },
      { status: 200 }
    );
  }
}