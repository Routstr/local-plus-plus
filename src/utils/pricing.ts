export const formatSatsCompact = (value: number): string => {
  if (!isFinite(value) || isNaN(value) || value <= 0) {return '0';}
  if (value >= 10) {return String(Math.round(value));}
  if (value >= 1) {return (Math.round(value * 10) / 10).toFixed(1);}
  if (value >= 0.1) {return (Math.round(value * 10) / 10).toFixed(1);}
  if (value >= 0.01) {return (Math.round(value * 100) / 100).toFixed(2);}
  return (Math.round(value * 1000) / 1000).toFixed(3);
};
