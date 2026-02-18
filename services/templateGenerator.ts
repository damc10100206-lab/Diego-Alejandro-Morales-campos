
import * as XLSX from "xlsx";

export const generatePlantTemplate = () => {
  // 1. Hoja de Instructivo
  const instructionsData = [
    ["GUÍA PARA EL DILIGENCIAMIENTO - PLANTA DE PERSONAL CNSC EARM"],
    [""],
    ["IMPORTANTE: Siga estas instrucciones para garantizar la correcta auditoría automática."],
    [""],
    ["1. NO MODIFIQUE LOS ENCABEZADOS", "Las columnas de la hoja 'PLANTA_OFICIAL' no deben cambiarse de nombre ni de orden."],
    ["2. COLUMNA 'NIVEL JERÁRQUICO'", "Use obligatoriamente uno de estos términos: Directivo, Asesor, Profesional, Técnico, Asistencial."],
    ["3. COLUMNA 'NATURALEZA'", "Para cargos de carrera, debe contener la palabra 'Carrera'. Ejemplo: 'Carrera Administrativa'."],
    ["4. COLUMNA 'CANTIDAD'", "Debe ser un número entero que represente el total de plazas creadas para ese cargo."],
    ["5. NO COMBINAR CELDAS", "La tabla debe ser plana, una fila por cada denominación de empleo."],
    [""],
    ["NOTA PARA PROFESIONALES:", "Si el cargo tiene vacantes, asegúrese de que la 'Cantidad' sea el total de plazas, no solo las vacantes."],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);

  // Ajustar ancho de columnas para el instructivo
  wsInstructions['!cols'] = [{ wch: 40 }, { wch: 100 }];

  // 2. Hoja de Datos (Planta)
  const headers = [
    "No.",
    "Denominación del Empleo",
    "Código",
    "Grado",
    "Cantidad Total",
    "Nivel Jerárquico",
    "Naturaleza del Empleo",
    "Dependencia / Área",
    "Observaciones"
  ];

  // Fila de ayuda (Notas in-situ)
  const helpRow = [
    "(Consecutivo)",
    "(Ej: Profesional Universitario)",
    "(Ej: 219)",
    "(Ej: 01)",
    "(Número Entero)",
    "(Seleccione: Directivo, Asesor, Profesional, Técnico, Asistencial)",
    "(Seleccione: Carrera Administrativa, Libre Nombramiento, Provisional, Periodo Fijo)",
    "(Oficina o Grupo)",
    "(Opcional)"
  ];

  // Fila de Ejemplo
  const exampleRow = [
    1,
    "Profesional Especializado",
    "2028",
    "14",
    5,
    "Profesional",
    "Carrera Administrativa",
    "Subdirección de Gestión",
    "Ejemplo de diligenciamiento"
  ];

  const plantData = [headers, helpRow, exampleRow];
  const wsPlant = XLSX.utils.aoa_to_sheet(plantData);

  // Ajustar ancho de columnas para la planta
  wsPlant['!cols'] = [
    { wch: 10 }, // No
    { wch: 40 }, // Denominación
    { wch: 10 }, // Código
    { wch: 10 }, // Grado
    { wch: 15 }, // Cantidad
    { wch: 20 }, // Nivel
    { wch: 30 }, // Naturaleza
    { wch: 30 }, // Dependencia
    { wch: 30 }  // Obs
  ];

  // Crear Libro
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsInstructions, "INSTRUCTIVO");
  XLSX.utils.book_append_sheet(workbook, wsPlant, "PLANTA_OFICIAL");

  // Descargar archivo
  XLSX.writeFile(workbook, "Formato_Planta_Personal_Estandar_CNSC.xlsx");
};
