"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { 
  FaEnvelope, 
  FaLock, 
  FaSignInAlt,
  FaArrowLeft,
  FaShoppingBag,
  FaSpinner,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campos requeridos",
        text: "Por favor ingresa tu email y contraseña",
        confirmButtonColor: "#000000"
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await res.json();
      console.log("Respuesta del servidor:", data); // Para depurar

      if (res.ok) {
  // Guardar token y datos del usuario
  sessionStorage.setItem("token", data.token);
sessionStorage.setItem("usuario", JSON.stringify(data.usuario));
  
  // ✅ IMPORTANTE: El rol está dentro de data.usuario
  const rol = data.usuario.rol;
  
  await Swal.fire({
    icon: "success",
    title: "¡Bienvenido!",
    text: `Has iniciado sesión como ${rol === "admin" ? "Administrador" : "Empleado"}`,
    confirmButtonColor: "#000000",
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false
  });
  
  // ✅ Redirigir al dashboard (allí ya manejas la vista según el rol)
  router.push("/dashboard");
  
} else {
  // Manejar errores
  let mensajeError = "Error al iniciar sesión";
  
  if (res.status === 404) {
    mensajeError = "Usuario no encontrado";
  } else if (res.status === 401) {
    mensajeError = "Contraseña incorrecta";
  } else {
    mensajeError = data.error || "Error en el servidor";
  }
  
  Swal.fire({
    icon: "error",
    title: "Error",
    text: mensajeError,
    confirmButtonColor: "#000000"
  });
}
    } catch (error) {
      console.error("Error de conexión:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor",
        confirmButtonColor: "#000000"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-4">
      {/* Botón de retroceso */}
      <button
        onClick={() => router.back()}
        className={`absolute top-6 left-6 text-black hover:text-gray-600 transition-colors flex items-center gap-2 ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={loading}
      >
        <FaArrowLeft className="text-lg text-black" />
        <span className="hidden sm:inline">Volver</span>
      </button>

      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-black mb-4 bg-white shadow-sm">
          <FaShoppingBag className="text-4xl text-black" />
        </div>
        <h1 className="text-3xl font-light tracking-wider text-black">
          BLACKS
        </h1>
        <p className="text-sm uppercase tracking-[0.3em] text-gray-600 mt-1">
          Boutique
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white border border-gray-200 p-8 rounded-2xl shadow-xl"
      >
        <h2 className="text-2xl font-light mb-8 text-center text-black flex items-center justify-center gap-2">
          <FaSignInAlt className="text-black" />
          Iniciar Sesión
        </h2>

        {/* Campo Email */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaEnvelope className="text-black" />
          </div>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black placeholder-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Campo Contraseña */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaLock className="text-black" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black placeholder-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-black transition-colors"
            disabled={loading}
          >
            {showPassword ? <FaEyeSlash className="text-black" /> : <FaEye className="text-black" />}
          </button>
        </div>

        {/* Botón de inicio de sesión */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200 font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin text-white" />
              Iniciando sesión...
            </>
          ) : (
            <>
              <FaSignInAlt className="group-hover:scale-110 transition-transform text-white" />
              Iniciar Sesión
            </>
          )}
        </button>

        {/* Enlace a registro */}
        <p className="mt-6 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => !loading && router.push("/register")}
            className={`text-black font-medium hover:underline focus:outline-none ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            Regístrate aquí
          </button>
        </p>
      </form>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-500">
        © {new Date().getFullYear()} Blacks Boutique. Todos los derechos reservados.
      </p>
    </div>
  );
}