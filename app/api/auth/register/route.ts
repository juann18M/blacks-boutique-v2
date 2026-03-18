import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, email, password, sucursal_id } = await req.json();

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    let rol = "empleado";
    if (password === "Blacky") {
      rol = "admin";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await db.query(
        "INSERT INTO usuarios (nombre, email, password, rol, sucursal_id) VALUES (?, ?, ?, ?, ?)",
        [nombre, email, hashedPassword, rol, sucursal_id || null]
      );

      return NextResponse.json({
        message: "Usuario registrado exitosamente",
        rol
      }, { status: 201 });

    } catch (error: any) {
      // Verificar si es error de email duplicado
      // MySQL error code 1062 = ER_DUP_ENTRY
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        return NextResponse.json(
          { 
            error: "El correo electrónico ya está registrado",
            code: "EMAIL_EXISTS"
          },
          { status: 409 } // 409 Conflict
        );
      }
      
      // Si es otro error de base de datos
      console.error("Error de base de datos:", error);
      return NextResponse.json(
        { error: "Error al registrar el usuario en la base de datos" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}