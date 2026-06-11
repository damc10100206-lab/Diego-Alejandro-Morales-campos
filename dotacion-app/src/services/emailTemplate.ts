import { Company } from '../types';

export const buildEmailBody = (company: Company, senderName: string): string => {
  const contact = company.contactPerson ? `${company.contactPerson}` : 'Estimado/a encargado/a de compras';
  return `${contact},

Me permito contactarle en nombre de ${senderName}, empresa especializada en dotación industrial y elementos de protección personal (EPP) en Bogotá.

Conocemos que empresas del sector ${company.sector} como la suya requieren dotación de calidad para garantizar la seguridad de sus trabajadores. Por ello, nos complace presentarles nuestra oferta:

✅ Guantes industriales (nitrilo, cuero, PVC)
✅ Cascos y protección para la cabeza
✅ Calzado de seguridad con puntera de acero
✅ Overoles y ropa de trabajo
✅ Gafas y protección visual
✅ Tapabocas y respiradores
✅ Arneses y elementos de trabajo en alturas

💰 Precios especiales por volumen:
- 10 a 25 unidades: 5% descuento
- 26 a 50 unidades: 10% descuento
- Más de 50 unidades: cotización personalizada

Adjunto encontrará nuestro catálogo completo con precios actualizados.

Estamos disponibles para visitar sus instalaciones o atenderle en el horario que sea más conveniente para usted.

Para más información:
📞 WhatsApp / Llamada: [NÚMERO DE CONTACTO]
📧 [CORREO ELECTRÓNICO]

Quedamos atentos a sus comentarios.

Cordialmente,
${senderName}
Dotación Industrial — Bogotá, Colombia`.trim();
};

export const buildEmailSubject = (company: Company): string =>
  `Cotización Dotación Industrial y EPP — ${company.name}`;

export const buildWhatsAppMessage = (company: Company, senderName: string): string => {
  const contact = company.contactPerson ? `, ${company.contactPerson}` : '';
  return `Hola${contact} 👋

Soy de *${senderName}*, empresa de dotación industrial en Bogotá.

Le escribo porque trabajamos con empresas del sector *${company.sector}* y quería presentarles nuestra oferta de EPP y ropa de trabajo con precios especiales por volumen.

📦 Manejamos:
• Guantes, cascos, calzado de seguridad
• Overoles y ropa de trabajo
• Gafas, tapabocas, arneses

¿Le puedo enviar nuestro catálogo de precios?`;
};
