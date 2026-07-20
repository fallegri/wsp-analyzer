import { ConversationData } from '../types';
import { calculateGeneralStats, calculateParticipantStats } from './stats-service';
import { generateWordCloud } from './wordcloud-service';
import { analyzeSentiment } from './sentiment-service';
import { analyzeTopics } from './topics-service';
import ExcelJS from 'exceljs';

export function exportToJson(data: ConversationData): string {
  const stats = calculateGeneralStats(data);
  const participants = calculateParticipantStats(data);
  const wordcloud = generateWordCloud(data);
  const sentiment = analyzeSentiment(data);

  const exportData = {
    conversation: {
      id: data.id,
      fileName: data.fileName,
      participants: data.participants,
      startDate: data.startDate,
      endDate: data.endDate,
      messageCount: data.messages.length,
    },
    stats,
    participants,
    wordcloud,
    sentiment,
    messages: data.messages.map(m => ({
      date: m.date,
      participant: m.participant,
      text: m.text,
      isSystem: m.isSystem,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportToCsv(data: ConversationData): string {
  const messages = data.messages.filter(m => !m.isSystem);

  const headers = ['Fecha', 'Participante', 'Mensaje', 'Tipo'];
  const rows = messages.map(m => {
    const date = m.date.toISOString();
    const participant = `"${m.participant.replace(/"/g, '""')}"`;
    const text = `"${m.text.replace(/"/g, '""')}"`;
    const type = m.isSystem ? 'Sistema' : 'Mensaje';
    return `${date},${participant},${text},${type}`;
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function exportToExcel(data: ConversationData): Promise<Buffer> {
  const stats = calculateGeneralStats(data);
  const participants = calculateParticipantStats(data);
  const wordcloud = generateWordCloud(data, 200);
  const sentiment = analyzeSentiment(data);
  const topics = analyzeTopics(data);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WhatsApp Analyzer';
  workbook.created = new Date();

  const HEADER_STYLE: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075E54' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  const CELL_STYLE: Partial<ExcelJS.Style> = {
    alignment: { vertical: 'middle' },
    border: {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    },
  };

  // --- Sheet 1: Resumen ---
  const ws1 = workbook.addWorksheet('Resumen');
  ws1.columns = [
    { header: 'Propiedad', key: 'prop', width: 30 },
    { header: 'Valor', key: 'val', width: 50 },
  ];
  ws1.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  const summaryRows = [
    { prop: 'Archivo', val: data.fileName },
    { prop: 'ID Conversación', val: data.id },
    { prop: 'Participantes', val: data.participants.join(', ') },
    { prop: 'Total Mensajes', val: stats.totalMessages.toString() },
    { prop: 'Mensajes de Sistema', val: data.messages.filter(m => m.isSystem).length.toString() },
    { prop: 'Inicio', val: new Date(data.startDate).toLocaleString('es-ES') },
    { prop: 'Fin', val: new Date(data.endDate).toLocaleString('es-ES') },
    { prop: 'Días de Conversación', val: stats.durationDays.toString() },
    { prop: 'Palabras Totales', val: stats.totalWords.toLocaleString() },
    { prop: 'Caracteres / Mensaje', val: stats.avgMessageLength.toString() },
    { prop: 'Día más Activo', val: stats.busiestDay },
    { prop: 'Hora más Activa', val: `${stats.busiestHour}:00` },
    { prop: 'Puntuación de Sentimiento', val: sentiment.overall.score.toString() },
    { prop: 'Positivos', val: `${sentiment.overall.positive}%` },
    { prop: 'Neutros', val: `${sentiment.overall.neutral}%` },
    { prop: 'Negativos', val: `${sentiment.overall.negative}%` },
  ];
  summaryRows.forEach((r, i) => {
    const row = ws1.addRow(r);
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  });

  // --- Sheet 2: Participantes ---
  const ws2 = workbook.addWorksheet('Participantes');
  ws2.columns = [
    { header: '#', key: 'rank', width: 6 },
    { header: 'Participante', key: 'name', width: 30 },
    { header: 'Mensajes', key: 'msgs', width: 12 },
    { header: 'Palabras', key: 'words', width: 12 },
    { header: 'Caracteres', key: 'chars', width: 12 },
    { header: 'Longitud Media', key: 'avg', width: 16 },
    { header: 'Score Sentimiento', key: 'score', width: 18 },
    { header: 'Primer Mensaje', key: 'first', width: 22 },
    { header: 'Último Mensaje', key: 'last', width: 22 },
  ];
  ws2.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  participants.forEach((p, i) => {
    const row = ws2.addRow({
      rank: i + 1,
      name: p.participant,
      msgs: p.messageCount,
      words: p.wordCount,
      chars: p.charCount,
      avg: p.avgMessageLength,
      score: p.sentimentScore,
      first: p.firstMessage.toISOString(),
      last: p.lastMessage.toISOString(),
    });
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  });

  // --- Sheet 3: Sentimientos ---
  const ws3 = workbook.addWorksheet('Sentimientos');
  ws3.columns = [
    { header: 'Participante', key: 'name', width: 30 },
    { header: 'Mensajes', key: 'msgs', width: 12 },
    { header: 'Positivos', key: 'pos', width: 12 },
    { header: 'Negativos', key: 'neg', width: 12 },
    { header: 'Neutros', key: 'neu', width: 12 },
    { header: 'Score', key: 'score', width: 10 },
  ];
  ws3.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  ws3.addRow({
    name: 'TOTAL',
    msgs: participants.reduce((a, b) => a + b.messageCount, 0),
    pos: sentiment.overall.positive,
    neg: sentiment.overall.negative,
    neu: sentiment.overall.neutral,
    score: sentiment.overall.score,
  }).eachCell(c => { c.font = { bold: true }; c.style = { ...CELL_STYLE, font: { bold: true } }; });

  Object.entries(sentiment.perParticipant || {}).forEach(([name, s], i) => {
    const row = ws3.addRow({
      name, msgs: s.totalMessages,
      pos: s.positive, neg: s.negative, neu: s.neutral, score: s.score,
    });
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  });

  // --- Sheet 4: Tópicos ---
  const ws4 = workbook.addWorksheet('Tópicos');
  ws4.columns = [
    { header: 'Tópico', key: 'name', width: 40 },
    { header: 'Mensajes', key: 'msgs', width: 12 },
    { header: 'Sentimiento', key: 'sentiment', width: 20 },
    { header: 'Palabras Clave', key: 'keywords', width: 60 },
  ];
  ws4.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  topics.forEach((t, i) => {
    const row = ws4.addRow({
      name: t.name,
      msgs: t.messageCount,
      sentiment: t.sentiment,
      keywords: t.keywords.join(', '),
    });
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  });

  // --- Sheet 5: Nube de Palabras ---
  const ws5 = workbook.addWorksheet('Nube de Palabras');
  ws5.columns = [
    { header: '#', key: 'rank', width: 6 },
    { header: 'Palabra', key: 'word', width: 30 },
    { header: 'Frecuencia', key: 'freq', width: 14 },
  ];
  ws5.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  wordcloud.forEach((w, i) => {
    const row = ws5.addRow({ rank: i + 1, word: w.word, freq: w.count });
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  });

  // --- Sheet 6: Mensajes ---
  const ws6 = workbook.addWorksheet('Mensajes');
  ws6.columns = [
    { header: 'Fecha', key: 'date', width: 22 },
    { header: 'Participante', key: 'participant', width: 30 },
    { header: 'Mensaje', key: 'text', width: 100 },
    { header: 'Tipo', key: 'type', width: 10 },
  ];
  ws6.getRow(1).eachCell(c => { c.style = HEADER_STYLE; });

  for (let i = 0; i < data.messages.length; i++) {
    const m = data.messages[i];
    const row = ws6.addRow({
      date: m.date.toISOString(),
      participant: m.participant,
      text: m.text,
      type: m.isSystem ? 'Sistema' : 'Mensaje',
    });
    row.eachCell(c => { c.style = CELL_STYLE; });
    if (i % 2 === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }; });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
