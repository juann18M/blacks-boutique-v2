// Servicio para enviar mensajes de WhatsApp
export const enviarMensajeWhatsApp = async (telefono: string, mensaje: string) => {
  try {
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappLink = `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`;
    
    console.log('📱 Enlace de WhatsApp generado:', whatsappLink);
    
    return {
      success: true,
      link: whatsappLink,
      mensaje: 'Enlace generado correctamente'
    };
    
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    return {
      success: false,
      error: 'Error al enviar mensaje'
    };
  }
};

// Plantillas de mensajes MEJORADAS
export const plantillas = {
  apartadoCreado: (cliente: string, folio: string, producto: string, cantidad: number, 
                   fechaLimite: string, anticipo: number, anticipoMetodo: string, 
                   saldo: number, total: number) => {
    
    const metodoTexto = {
      efectivo: '💵 Efectivo',
      tarjeta: '💳 Tarjeta',
      transferencia: '🏦 Transferencia'
    }[anticipoMetodo] || 'Efectivo';

    return `🛍️ *BLACKS BOUTIQUE* 🛍️

Hola *${cliente}*, gracias por tu apartado! 

📍 *FOLIO:* ${folio}
📍 *PRODUCTO:* ${producto} (${cantidad} pz)
📍 *FECHA LÍMITE:* ${fechaLimite}

💰 *DETALLE DE PAGO:*
━━━━━━━━━━━━━━━━
Total: $${total.toFixed(2)}
Anticipo (${metodoTexto}): $${anticipo.toFixed(2)}
Saldo pendiente: $${saldo.toFixed(2)}
━━━━━━━━━━━━━━━━

📱 *PRÓXIMOS PASOS:*
• Puedes realizar abonos en cualquier momento
• El saldo debe liquidarse antes del ${fechaLimite}
• Pasada la fecha, el apartado se cancelará

¡Te esperamos! ❤️`;
  },

  abonoRegistrado: (cliente: string, folio: string, producto: string, 
                    monto: number, metodo: string, saldoAnterior: number, 
                    saldoNuevo: number, fechaLimite: string) => {
    
    const metodoTexto = {
      efectivo: '💵 Efectivo',
      tarjeta: '💳 Tarjeta',
      transferencia: '🏦 Transferencia'
    }[metodo] || 'Efectivo';

    return `🛍️ *BLACKS BOUTIQUE* 🛍️

Hola *${cliente}*, hemos recibido un abono a tu apartado!

📍 *FOLIO:* ${folio}
📍 *PRODUCTO:* ${producto}

💰 *ABONO REGISTRADO:*
━━━━━━━━━━━━━━━━
Monto: $${monto.toFixed(2)} (${metodoTexto})
Saldo anterior: $${saldoAnterior.toFixed(2)}
Saldo actual: $${saldoNuevo.toFixed(2)}
━━━━━━━━━━━━━━━━

📱 Fecha límite: ${fechaLimite}

¡Gracias por tu pago! ❤️`;
  },

  apartadoCompletado: (cliente: string, folio: string, producto: string) => {
    return `🎉 *¡FELICIDADES!* 🎉

Hola *${cliente}*, has liquidado tu apartado *${folio}* del producto *${producto}*.

📍 *Ya puedes pasar a recogerlo* a nuestra tienda.

¡Gracias por tu compra! ❤️

*BLACKS BOUTIQUE*`;
  },

  apartadoVencido: (cliente: string, folio: string, producto: string) => {
    return `⏰ *AVISO IMPORTANTE* ⏰

Hola *${cliente}*, tu apartado *${folio}* del producto *${producto}* ha vencido.

Si aún estás interesado, puedes contactarnos para renovarlo.

*BLACKS BOUTIQUE*`;
  },

  recordatorioPago: (cliente: string, folio: string, producto: string, 
                     saldo: number, diasRestantes: number) => {
    return `🔔 *RECORDATORIO* 🔔

Hola *${cliente}*, tu apartado *${folio}* del producto *${producto}* tiene un saldo pendiente de *$${saldo.toFixed(2)}*.

📍 *DÍAS RESTANTES:* ${diasRestantes}

Realiza tu pago antes de la fecha límite.

*BLACKS BOUTIQUE*`;
  }
};