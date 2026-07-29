/**
 * validate-glossary-links.js — ALIAS de compatibilidade.
 *
 * As checagens de link de glossario (slug de idioma cruzado + destino
 * inexistente) foram GENERALIZADAS para todo link interno de navegacao e vivem
 * agora em `scripts/validate-internal-links.js`. O glossario era um recorte
 * arbitrario do mesmo problema: "o destino existe?" vale para qualquer link.
 *
 * Este arquivo existe apenas para que `npm run validate:glossary-links` continue
 * funcionando. Nao ha logica duplicada — ele so executa o validador geral.
 * Prefira `npm run validate:internal-links`.
 */
import './validate-internal-links.js';
