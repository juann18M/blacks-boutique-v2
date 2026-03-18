"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaStore, 
  FaUserPlus,
  FaArrowLeft,
  FaShoppingBag,
  FaExclamationTriangle,
  FaSpinner
} from "react-icons/fa";

export default function Register() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [campoEnFoco, setCampoEnFoco] = useState<string | null>(null);

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const res = await fetch("/api/sucursales");
        const data = await res.json();
        setSucursales(data);
      } catch (error) {
        console.error("Error al cargar sucursales:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar las sucursales",
          confirmButtonColor: "#000000"
        });
      }
    };
    cargarSucursales();
  }, []);

  // Validar formato de email
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(""); // Limpiar error cuando el usuario escribe
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que todos los campos requeridos estén llenos
    if (!nombre.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Por favor ingresa tu nombre",
        confirmButtonColor: "#000000"
      });
      return;
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      Swal.fire({
        icon: "warning",
        title: "Email inválido",
        text: "Por favor ingresa un correo electrónico válido",
        confirmButtonColor: "#000000"
      });
      return;
    }

    // Validar que la contraseña no esté vacía
    if (!password.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Por favor ingresa una contraseña",
        confirmButtonColor: "#000000"
      });
      return;
    }

    // Validar que los empleados seleccionen una sucursal
    if (password !== "Blacky" && !sucursalId) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Por favor selecciona una sucursal",
        confirmButtonColor: "#000000"
      });
      return;
    }

    setLoading(true);
    setEmailError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          password,
          sucursal_id: password === "Blacky" ? null : sucursalId
        })
      });

      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: "success",
          title: "¡Registro exitoso!",
          text: `Registrado como ${data.rol === "admin" ? "Administrador" : "Empleado"}`,
          confirmButtonColor: "#000000",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: true
        });
        router.push("/login");
      } else {
        // Manejar diferentes tipos de errores
        if (res.status === 409 || data.code === "EMAIL_EXISTS") {
          setEmailError("Este correo electrónico ya está registrado");
          
          const result = await Swal.fire({
            icon: "error",
            title: "Email ya registrado",
            html: `
              <p class="mb-4">El correo <strong>${email}</strong> ya tiene una cuenta.</p>
              <p class="text-sm text-gray-600">¿Qué deseas hacer?</p>
            `,
            showCancelButton: true,
            confirmButtonText: "Ir a iniciar sesión",
            cancelButtonText: "Usar otro email",
            confirmButtonColor: "#000000",
            cancelButtonColor: "#6b7280",
            reverseButtons: true
          });

          if (result.isConfirmed) {
            router.push("/login");
          } else {
            setEmail("");
            setTimeout(() => {
              document.getElementById("email-input")?.focus();
            }, 100);
          }
        } else {
          // Otros errores
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.error || "No se pudo completar el registro",
            confirmButtonColor: "#000000"
          });
        }
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
        confirmButtonColor: "#000000"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-4">
      {/* Botón de retroceso */}
      

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
        onSubmit={handleRegister}
        className="w-full max-w-md bg-white border border-gray-200 p-8 rounded-2xl shadow-xl"
      >
        <h2 className="text-2xl font-light mb-8 text-center text-black flex items-center justify-center gap-2">
          <FaUserPlus className="text-black" />
          Crear cuenta
        </h2>

        {/* Campo Nombre */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaUser className="text-black" />
          </div>
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black placeholder-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            onChange={(e) => setNombre(e.target.value)}
            onFocus={() => setCampoEnFoco('nombre')}
            onBlur={() => setCampoEnFoco(null)}
            required
            disabled={loading}
          />
        </div>

        {/* Campo Email con validación */}
        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaEnvelope className={`${emailError ? 'text-red-500' : 'text-black'}`} />
          </div>
          <input
            id="email-input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            className={`w-full pl-10 pr-10 py-3 bg-white border rounded-lg focus:outline-none focus:ring-1 transition-colors text-black placeholder-gray-400 ${
              emailError 
                ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:border-black focus:ring-black"
            }`}
            onChange={handleEmailChange}
            onFocus={() => setCampoEnFoco('email')}
            onBlur={() => setCampoEnFoco(null)}
            required
            disabled={loading}
          />
          {emailError && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <FaExclamationTriangle className="text-red-500" />
            </div>
          )}
        </div>
        
        {/* Mensaje de error de email */}
        {emailError && (
          <p className="text-red-500 text-xs mb-4 flex items-center gap-1">
            <FaExclamationTriangle className="text-xs text-red-500" />
            {emailError}
          </p>
        )}

        {/* Campo Contraseña */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaLock className="text-black" />
          </div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black placeholder-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setCampoEnFoco('password')}
            onBlur={() => setCampoEnFoco(null)}
            required
            disabled={loading}
          />
        </div>

        {/* Selector de Sucursal (solo para empleados) */}
        {password !== "Blacky" && (
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaStore className="text-black" />
            </div>
            <select
              className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-black appearance-none disabled:bg-gray-50 disabled:text-gray-500"
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              onFocus={() => setCampoEnFoco('sucursal')}
              onBlur={() => setCampoEnFoco(null)}
              required
              disabled={loading}
            >
              <option value="" className="text-gray-400">Selecciona una sucursal</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id} className="text-black">
                  {sucursal.nombre}
                </option>
              ))}
            </select>
            {/* Flecha personalizada */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Información para administradores */}
        {password === "Blacky" && (
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <FaLock className="text-black" />
              Te registrarás como <span className="font-semibold text-black">Administrador</span>
            </p>
          </div>
        )}

        {/* Botón de registro con estado de carga */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200 font-medium flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin text-white" />
              Registrando...
            </>
          ) : (
            <>
              <FaUserPlus className="group-hover:scale-110 transition-transform text-white" />
              Registrarse
            </>
          )}
        </button>

        {/* Enlace a login */}
        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => !loading && router.push("/login")}
            className={`text-black font-medium hover:underline focus:outline-none ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            Inicia sesión aquí
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