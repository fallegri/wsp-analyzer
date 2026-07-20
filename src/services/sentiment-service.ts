import { ConversationData, SentimentResult } from '../types';

export const POSITIVE_WORDS = new Set([
  'feliz', 'contento', 'alegre', 'genial', 'excelente', 'bueno', 'bien', 'hermoso',
  'maravilloso', 'fantástico', 'increíble', 'perfecto', 'amor', 'gracias', 'bonito',
  'lindo', 'divertido', 'encantador', 'espectacular', 'magnífico', 'estupendo',
  'mejor', 'belleza', 'éxito', 'felicidad', 'sonrisa', 'abrazo', 'disfrutar',
  'agradable', 'asombroso', 'fantástico', 'tranquilo', 'paz', 'alegría',
  'happy', 'great', 'awesome', 'excellent', 'good', 'beautiful', 'wonderful',
  'fantastic', 'incredible', 'perfect', 'love', 'thanks', 'amazing', 'nice',
  'fun', 'lovely', 'gorgeous', 'splendid', 'magnificent', 'superb', 'best',
  'beauty', 'success', 'happiness', 'smile', 'hug', 'enjoy', 'pleasant',
  'joy', 'peace', 'brilliant', 'wonderful', 'delightful', 'excited',
  'cute', 'pretty', 'glad', 'lol', 'jaja', 'jeje', 'haha', 'xd',
]);

export const NEGATIVE_WORDS = new Set([
  'triste', 'enojado', 'molesto', 'malo', 'mal', 'horrible', 'terrible', 'feo',
  'aburrido', 'cansado', 'enfadado', 'preocupado', 'estresado', 'deprimido',
  'odio', 'problema', 'difícil', 'lástima', 'pena', 'llorar', 'sufrir',
  'peor', 'odioso', 'desastre', 'fracaso', 'tristeza', 'dolor', 'enfermo',
  'desagradable', 'pésimo', 'asqueroso', 'horroroso', 'desgraciado',
  'sad', 'angry', 'upset', 'bad', 'horrible', 'terrible', 'ugly', 'boring',
  'tired', 'annoyed', 'worried', 'stressed', 'depressed', 'hate', 'problem',
  'difficult', 'waste', 'cry', 'suffer', 'worst', 'disaster', 'failure',
  'sadness', 'pain', 'sick', 'unpleasant', 'awful', 'disgusting', 'dreadful',
  'miserable', 'shit', 'mierda', 'estúpido', 'tonto', 'imbécil', 'idiota',
  'vergüenza', 'perder', 'perdí', 'perdió', 'odio', 'odiar',
]);

export function analyzeSentiment(data: ConversationData): SentimentResult {
  const messages = data.messages.filter(m => !m.isSystem);
  const perParticipant: Record<string, { positive: number; negative: number; neutral: number; score: number; totalMessages: number }> = {};
  const timelineMap: Record<string, { positive: number; negative: number; neutral: number }> = {};

  let totalPositive = 0;
  let totalNegative = 0;
  let totalNeutral = 0;

  for (const m of messages) {
    const words = m.text.toLowerCase().split(/\s+/);
    let posCount = 0;
    let negCount = 0;

    for (const w of words) {
      const clean = w.replace(/[^a-záéíóúàâãêôõçüñ]/g, '');
      if (POSITIVE_WORDS.has(clean)) posCount++;
      if (NEGATIVE_WORDS.has(clean)) negCount++;
    }

    const sentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

    if (!perParticipant[m.participant]) {
      perParticipant[m.participant] = { positive: 0, negative: 0, neutral: 0, score: 0, totalMessages: 0 };
    }
    perParticipant[m.participant].totalMessages++;
    if (sentiment === 'positive') { perParticipant[m.participant].positive++; totalPositive++; }
    else if (sentiment === 'negative') { perParticipant[m.participant].negative++; totalNegative++; }
    else { perParticipant[m.participant].neutral++; totalNeutral++; }

    const dateKey = m.date.toISOString().split('T')[0];
    if (!timelineMap[dateKey]) timelineMap[dateKey] = { positive: 0, negative: 0, neutral: 0 };
    if (sentiment === 'positive') timelineMap[dateKey].positive++;
    else if (sentiment === 'negative') timelineMap[dateKey].negative++;
    else timelineMap[dateKey].neutral++;
  }

  for (const p of Object.keys(perParticipant)) {
    const t = perParticipant[p].totalMessages;
    perParticipant[p].score = t > 0 ? Math.round(((perParticipant[p].positive - perParticipant[p].negative) / t) * 100) : 0;
  }

  const total = totalPositive + totalNegative + totalNeutral;
  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date, ...val }));

  return {
    overall: {
      positive: total > 0 ? Math.round((totalPositive / total) * 100) : 0,
      negative: total > 0 ? Math.round((totalNegative / total) * 100) : 0,
      neutral: total > 0 ? Math.round((totalNeutral / total) * 100) : 0,
      score: total > 0 ? Math.round(((totalPositive - totalNegative) / total) * 100) : 0,
    },
    perParticipant,
    timeline,
  };
}

function classifyMessageSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const words = text.toLowerCase().split(/\s+/);
  let posCount = 0;
  let negCount = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-záéíóúàâãêôõçüñ]/g, '');
    if (POSITIVE_WORDS.has(clean)) posCount++;
    if (NEGATIVE_WORDS.has(clean)) negCount++;
  }
  return posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';
}

export function getMessagesBySentiment(data: ConversationData, type: 'positive' | 'negative' | 'neutral') {
  const messages = data.messages.filter(m => !m.isSystem);
  const filtered = messages.filter(m => classifyMessageSentiment(m.text) === type);
  return filtered.slice(-100).reverse().map(m => ({
    date: m.date.toISOString(),
    participant: m.participant,
    text: m.text.slice(0, 500),
  }));
}

export function getFullSentimentAnalysis(data: ConversationData) {
  const messages = data.messages.filter(m => !m.isSystem);
  return messages.map(m => ({
    date: m.date.toISOString(),
    participant: m.participant,
    text: m.text.slice(0, 500),
    sentiment: classifyMessageSentiment(m.text),
  }));
}
