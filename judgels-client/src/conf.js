export const Mode = {
  JUDGELS: 'JUDGELS',
  TLX: 'TLX',
};

const defaultConf = {
  mode: Mode.TLX,
  name: 'Judgels',
  slogan: 'Local Programming Contest System',
  apiUrl: (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/api/v2',
};

export const APP_CONFIG = (typeof window !== 'undefined' && window.conf) ? window.conf : defaultConf;

export function isTLX() {
  return APP_CONFIG.mode === Mode.TLX;
}
