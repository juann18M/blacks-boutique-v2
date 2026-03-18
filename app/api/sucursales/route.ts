import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(
    "SELECT * FROM sucursales"
  );

  return NextResponse.json(rows);

}