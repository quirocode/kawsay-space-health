import type { Reading } from '../domain/types';

export function readingOrigin(reading: Reading, lang: 'en' | 'es') {
  const es = lang === 'es';
  if (reading.origin === 'sensor_sim') return es ? 'Sensor simulado' : 'Simulated sensor';
  if (reading.origin === 'camera') return es ? 'Captura por cámara' : 'Camera capture';
  if (reading.simulated) return es ? 'Registro manual simulado' : 'Simulated manual entry';
  return es ? 'Registro manual' : 'Manual entry';
}
