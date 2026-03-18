import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const sucursal_id = searchParams.get("sucursal_id");

  const [rows]: any = await db.query(
    "SELECT * FROM caja WHERE sucursal_id = ? AND abierta = true LIMIT 1",
    [sucursal_id]
  );

  return NextResponse.json(rows[0] || null);

}