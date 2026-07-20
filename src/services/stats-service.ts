import { ConversationData, GeneralStats, ParticipantStats, Message } from '../types';

export function calculateGeneralStats(data: ConversationData): GeneralStats {
  const messages = data.messages.filter(m => !m.isSystem);
  const totalMessages = messages.length;
  const totalWords = messages.reduce((sum, m) => sum + m.text.split(/\s+/).filter(w => w).length, 0);
  const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);

  const messagesByHour: Record<string, number> = {};
  const messagesByDate: Record<string, number> = {};
  const messagesByDay: Record<string, number> = {};

  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  for (const m of messages) {
    const hour = m.date.getHours().toString().padStart(2, '0');
    const dateKey = m.date.toISOString().split('T')[0];
    const dayKey = dayNames[m.date.getDay()];

    messagesByHour[hour] = (messagesByHour[hour] || 0) + 1;
    messagesByDate[dateKey] = (messagesByDate[dateKey] || 0) + 1;
    messagesByDay[dayKey] = (messagesByDay[dayKey] || 0) + 1;
  }

  let busiestHour = 0;
  let busiestHourCount = 0;
  for (const [h, c] of Object.entries(messagesByHour)) {
    if (c > busiestHourCount) {
      busiestHourCount = c;
      busiestHour = parseInt(h);
    }
  }

  let busiestDay = '';
  let busiestDayCount = 0;
  for (const [d, c] of Object.entries(messagesByDay)) {
    if (c > busiestDayCount) {
      busiestDayCount = c;
      busiestDay = d;
    }
  }

  const diffMs = data.endDate.getTime() - data.startDate.getTime();
  const durationDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return {
    totalMessages,
    totalParticipants: data.participants.length,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
    durationDays,
    messagesByHour,
    messagesByDay,
    messagesByDate,
    totalWords,
    avgMessageLength: totalMessages > 0 ? Math.round(totalChars / totalMessages) : 0,
    busiestHour,
    busiestDay,
  };
}

export function calculateParticipantStats(data: ConversationData): ParticipantStats[] {
  const messages = data.messages.filter(m => !m.isSystem);
  const participantMap: Record<string, Message[]> = {};

  for (const m of messages) {
    if (!participantMap[m.participant]) participantMap[m.participant] = [];
    participantMap[m.participant].push(m);
  }

  const result: ParticipantStats[] = [];
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  for (const [participant, msgs] of Object.entries(participantMap)) {
    const wordCount = msgs.reduce((sum, m) => sum + m.text.split(/\s+/).filter(w => w).length, 0);
    const charCount = msgs.reduce((sum, m) => sum + m.text.length, 0);
    const sorted = [...msgs].sort((a, b) => a.date.getTime() - b.date.getTime());

    const messagesByHour: Record<string, number> = {};
    const messagesByDay: Record<string, number> = {};

    for (const m of msgs) {
      const hour = m.date.getHours().toString().padStart(2, '0');
      const dayKey = dayNames[m.date.getDay()];
      messagesByHour[hour] = (messagesByHour[hour] || 0) + 1;
      messagesByDay[dayKey] = (messagesByDay[dayKey] || 0) + 1;
    }

    result.push({
      participant,
      messageCount: msgs.length,
      wordCount,
      charCount,
      avgMessageLength: msgs.length > 0 ? Math.round(charCount / msgs.length) : 0,
      firstMessage: sorted[0].date,
      lastMessage: sorted[sorted.length - 1].date,
      messagesByHour,
      messagesByDay,
      sentimentScore: 0,
    });
  }

  result.sort((a, b) => b.messageCount - a.messageCount);
  return result;
}
