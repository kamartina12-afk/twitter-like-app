const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getOrdinalSuffix = (day: number) => {
  if (day >= 11 && day <= 13) return 'th';
  const lastDigit = day % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
};

export const formatReadableDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
};

