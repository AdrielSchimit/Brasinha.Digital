const TIME_ZONE = 'America/Campo_Grande';
const OPEN_MINUTES = 18 * 60;
const CLOSE_MINUTES = 23 * 60 + 30;
const CLOSED_WEEKDAY = 'Tue';

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const out = {};
  for (const part of parts) if (part.type !== 'literal') out[part.type] = part.value;
  return out;
}

function isOpenAt(date = new Date()) {
  const p = zonedParts(date);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  return p.weekday !== CLOSED_WEEKDAY && minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES;
}

function nextOpenLabel(date = new Date()) {
  const p = zonedParts(date);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const dayNames = { Sun: 'domingo', Mon: 'segunda-feira', Tue: 'terça-feira', Wed: 'quarta-feira', Thu: 'quinta-feira', Fri: 'sexta-feira', Sat: 'sábado' };
  const sequence = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  if (p.weekday !== CLOSED_WEEKDAY && minutes < OPEN_MINUTES) return 'Hoje às 18:00';

  let index = sequence.indexOf(p.weekday);
  for (let offset = 1; offset <= 7; offset++) {
    const next = sequence[(index + offset) % 7];
    if (next !== CLOSED_WEEKDAY) {
      if (offset === 1) return `Amanhã às 18:00`;
      return `${dayNames[next]} às 18:00`;
    }
  }
  return 'às 18:00';
}

function status(date = new Date()) {
  const p = zonedParts(date);
  const open = isOpenAt(date);
  return {
    open,
    timeZone: TIME_ZONE,
    localTime: `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`,
    schedule: 'Quarta a segunda, 18:00–23:30. Terça-feira fechado.',
    nextOpen: open ? null : nextOpenLabel(date)
  };
}

module.exports = { TIME_ZONE, isOpenAt, status };
