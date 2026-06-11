import { Company, SECTOR_LABELS, Sector } from '../types';

const EMPRESA_DIR = 'Carrera 34 # 2-62, Bogotá, Colombia';

export const buildEmailBody = (company: Company, senderName: string): string => {
  const contact = company.contactPerson
    ? `Señor/a ${company.contactPerson}`
    : 'Estimado/a encargado/a de compras';
  const sectorLabel = SECTOR_LABELS[company.sector as Sector] || company.sector;
  return `${contact},

Reciba un cordial saludo de parte de ${senderName}, empresa bogotana con amplia experiencia en dotación industrial y elementos de protección personal (EPP).

Nos dirigimos a usted porque conocemos que las empresas del sector de *${sectorLabel}* requieren dotación de calidad para proteger a sus trabajadores y cumplir con las normas de seguridad y salud en el trabajo.

Nuestra oferta incluye:

✅ Guantes industriales (nitrilo, cuero, PVC, vaqueta)
✅ Cascos de seguridad y protección para la cabeza
✅ Calzado de seguridad con puntera de acero y dieléctrico
✅ Overoles, uniformes y ropa de trabajo
✅ Gafas y caretas de protección visual
✅ Tapabocas, respiradores y protección respiratoria
✅ Arneses y equipos para trabajo en alturas
✅ Chalecos reflectivos y señalización

💰 Precios especiales según volumen:
  • 10 a 25 unidades: 5% de descuento
  • 26 a 50 unidades: 10% de descuento
  • Más de 50 unidades: cotización personalizada

Adjunto encontrará nuestro catálogo completo con precios actualizados.

Estamos ubicados en ${EMPRESA_DIR} y disponibles para visitar sus instalaciones sin costo, realizar medición de tallas y entregar directamente en su empresa.

Para cotizaciones o más información:
📞 WhatsApp / Llamada: [NÚMERO DE CONTACTO]
📍 ${EMPRESA_DIR}

Quedamos atentos a su respuesta y agradecemos la oportunidad de servirle.

Cordialmente,

${senderName}
Dotación Industrial y EPP — Bogotá, Colombia
📍 ${EMPRESA_DIR}`.trim();
};

export const buildEmailSubject = (company: Company): string =>
  `Cotización Dotación Industrial y EPP para ${company.name} — ${new Date().getFullYear()}`;

export const buildWhatsAppMessage = (company: Company, senderName: string): string => {
  const contact = company.contactPerson ? `, ${company.contactPerson}` : '';
  const sectorLabel = SECTOR_LABELS[company.sector as Sector] || company.sector;
  return `Hola${contact} 👋

Le saluda *${senderName}*, empresa de dotación industrial ubicada en Bogotá (Carrera 34 # 2-62).

Trabajamos con empresas del sector de *${sectorLabel}* y me gustaría presentarles nuestra oferta de dotación y EPP con precios especiales por volumen:

🦺 Overoles y ropa de trabajo
🧤 Guantes (nitrilo, cuero, PVC)
👷 Cascos y calzado de seguridad
😷 Tapabocas, gafas y respiradores
🪢 Arneses para trabajo en alturas

💰 Manejamos descuentos desde pedidos de 10 unidades.

¿Le puedo enviar nuestro catálogo con precios actualizados? También podemos visitarles sin costo para tomar medidas y hacer la cotización directamente en su empresa. 😊`;
};
