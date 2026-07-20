import { Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DATE_PATTERNS: RegExp[] = [
  // [DD/MM/AAAA, HH:MM:SS] (Brasil/Portugues)
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+/,
  // [DD/MM/AAAA HH:MM:SS] Nombre: mensaje
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+/,
  // [MM/DD/AAAA, HH:MM:SS] (US format)
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+/,
  // DD/MM/AAAA HH:MM - Nombre: mensaje
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s+/,
  // [DD/MM/AA, HH:MM:SS] Nombre: mensaje (2-digit year)
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+/,
  // [AAAA-MM-DD, HH:MM] (ISO format)
  /^\[(\d{4})-(\d{1,2})-(\d{1,2}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+/,
  // DD/MM/AA HH:MM - Nombre: mensaje (no brackets, 2-digit year)
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s+/,
  // DD/MM/AAAA, H:MM a.m./p.m. - Nombre: mensaje (12h AM/PM, thin space \u202F)
  /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\u202F([ap])\.\u202Fm\.\s*-\s+/,
];

const SYSTEM_KEYWORDS = [
  'se uni', 'sali', 'cambi', 'cre', 'elimin', 'agreg', 'entr', 'abandon',
  'te llamaste', 'te fuiste', 'se te a', 'se a', 'creador del grupo',
  'joined', 'left', 'changed', 'created', 'removed', 'added',
  'Messages and calls', 'This group', 'This chat', 'This message',
  'Los mensajes', 'El grupo', 'El chat', 'El mensaje', 'cifrados',
  'quit', 'aadi',
];

function isSystemMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return SYSTEM_KEYWORDS.some(k => lower.includes(k));
}

function normalizeYear(y: string): string {
  if (y.length === 2) {
    const num = parseInt(y);
    return num > 50 ? '19' + y : '20' + y;
  }
  if (y.length === 3) return '2' + y;
  return y;
}

function detectDateOrder(lines: string[]): 'DMY' | 'MDY' {
  let dmyCount = 0;
  let mdyCount = 0;
  for (const line of lines.slice(0, 50)) {
    const m = line.match(/^\[?(\d{1,2})\/(\d{1,2})\//);
    if (m) {
      const p1 = parseInt(m[1]);
      const p2 = parseInt(m[2]);
      if (p1 > 12 && p1 <= 31) dmyCount++;
      if (p2 > 12 && p2 <= 31) mdyCount++;
    }
  }
  return dmyCount > mdyCount ? 'DMY' : 'MDY';
}

function splitParticipantMessage(line: string, dateEndIndex: number): { participant: string; text: string } {
  const afterDate = line.slice(dateEndIndex);
  const colonIdx = afterDate.indexOf(':');
  if (colonIdx === -1) {
    return { participant: 'Sistema', text: afterDate.trim() };
  }
  const possibleName = afterDate.slice(0, colonIdx).trim();
  const msgText = afterDate.slice(colonIdx + 1).trim();

  if (possibleName.length === 0) {
    return { participant: 'Sistema', text: afterDate.trim() };
  }
  return { participant: possibleName, text: msgText };
}

export function parseWhatsApp(content: string): Message[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const messages: Message[] = [];
  const dateOrder = detectDateOrder(lines);

  let currentMessage: Partial<Message> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\u200E/, '');
    let matchedPattern: RegExpMatchArray | null = null;

    for (const pattern of DATE_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        matchedPattern = m;
        break;
      }
    }

    if (matchedPattern) {
      if (currentMessage?.text) {
        messages.push(currentMessage as Message);
      }

      let d: string, mo: string, y: string;
      if (dateOrder === 'DMY') {
        d = matchedPattern[1];
        mo = matchedPattern[2];
        y = matchedPattern[3];
      } else {
        mo = matchedPattern[1];
        d = matchedPattern[2];
        y = matchedPattern[3];
      }
      y = normalizeYear(y);

      let h = matchedPattern[4];
      const mi = matchedPattern[5];
      let s = matchedPattern[6];

      if (s === 'a' || s === 'p') {
        let hourNum = parseInt(h);
        if (s === 'p' && hourNum !== 12) hourNum += 12;
        if (s === 'a' && hourNum === 12) hourNum = 0;
        h = hourNum.toString();
        s = '00';
      } else {
        s = s || '00';
      }

      const dateStr = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi.padStart(2, '0')}:${s.padStart(2, '0')}`;
      const date = new Date(dateStr);

      const { participant, text } = splitParticipantMessage(line, matchedPattern[0].length);
      const isSys = isSystemMessage(text) || participant === 'Sistema';

      currentMessage = {
        id: uuidv4(),
        date,
        rawDate: dateStr,
        participant: isSys ? 'Sistema' : participant,
        text,
        isSystem: isSys,
      };
    } else if (currentMessage) {
      currentMessage.text += '\n' + line;
    }
  }

  if (currentMessage?.text) {
    messages.push(currentMessage as Message);
  }

  return messages;
}
