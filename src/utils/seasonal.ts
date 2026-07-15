import { config } from '../../site.config';
import type { SeasonalEvent } from '../types/config';

/**
 * Sazonalidade (Fase A): filtra os eventos de config.seasonal ativos na data
 * do BUILD. O bot rebuilda o site diariamente (posts automáticos), então os
 * banners entram/saem sozinhos com precisão de 1 dia. A contagem regressiva
 * do ticker é refinada no navegador (CotacaoBar), imune a builds atrasados.
 */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Eventos ativos (janela start..end inclusive) para um idioma. */
export function getActiveSeasonalEvents(locale: string, today: string = todayISO()): SeasonalEvent[] {
  return (config.seasonal?.events || []).filter(
    e => e.locales.includes(locale) && e.start <= today && today <= e.end
  );
}

/**
 * Evento com DECORAÇÃO site-wide ativa (Fase B). A janela do decor pode
 * começar antes da do banner (ex.: 30 dias); no máximo 1 decor por vez —
 * vale o primeiro da lista.
 */
export function getActiveDecorEvent(locale: string, today: string = todayISO()): SeasonalEvent | null {
  return (config.seasonal?.events || []).find(e =>
    e.decor && e.locales.includes(locale)
    && (e.decor.start || e.start) <= today && today <= (e.decor.end || e.end)
  ) || null;
}
