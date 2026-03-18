import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "2026",
  database: "blackssystem",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});