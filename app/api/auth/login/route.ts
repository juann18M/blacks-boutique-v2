import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const [rows]: any = await db.query(`
SELECT 
  usuarios.id,
  usuarios.nombre,
  usuarios.email,
  usuarios.password,
  usuarios.rol,
  usuarios.sucursal_id,
  sucursales.nombre AS sucursal_nombre
FROM usuarios
LEFT JOIN sucursales 
ON usuarios.sucursal_id = sucursales.id
WHERE usuarios.email = ?
`, [email]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const user = rows[0];

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    "super_secret_key",
    { expiresIn: "8h" }
  );

  return NextResponse.json({
    message: "Login correcto",
    token,
    usuario: {
  id: user.id,
  nombre: user.nombre,
  rol: user.rol,
  sucursal_id: user.sucursal_id,
  sucursal_nombre: user.sucursal_nombre
}
  });
}