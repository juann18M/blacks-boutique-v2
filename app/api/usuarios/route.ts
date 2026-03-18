import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const [rows] = await db.query("SELECT * FROM usuarios");
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { nombre, email, password, rol } = await req.json();

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
    [nombre, email, hashedPassword, rol]
  );

  return NextResponse.json({ message: "Usuario creado" });
}