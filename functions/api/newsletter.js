import siteConfig from '../_config.json';

export async function onRequestPost(context) {
  const { request, env } = context;

  const allowedOrigins = siteConfig.allowedOrigins;
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(JSON.stringify({ error: 'Email inválido.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    const lang = body.lang || 'pt';
    const source = body.source || 'newsletter';

    if (supabaseUrl && supabaseKey) {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,active`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const existing = await checkRes.json();

      if (existing.length > 0) {
        if (!existing[0].active) {
          await fetch(
            `${supabaseUrl}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ active: true, unsubscribed_at: null, lang, source })
            }
          );
        }
      } else {
        await fetch(
          `${supabaseUrl}/rest/v1/newsletter_subscribers`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ email, lang, source })
          }
        );
      }
    }

    // Send appropriate email based on source
    const resendKey = env.RESEND_API_KEY;
    if (resendKey) {
      const isLeadMagnet = source === 'guia-30-dias' || source === 'checklist-financeiro';
      const emailContent = isLeadMagnet
        ? getLeadMagnetEmailHTML(email, lang, source)
        : getWelcomeEmailHTML(email, lang);
      const subject = isLeadMagnet
        ? getLeadMagnetSubject(lang, source)
        : (lang === 'en' ? `Welcome to ${siteConfig.brandName} Newsletter!` :
           lang === 'es' ? `Bienvenido a la Newsletter ${siteConfig.brandName}!` :
           `Bem-vindo à Newsletter ${siteConfig.brandName}!`);

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: siteConfig.emailFrom,
          to: [email],
          subject,
          html: emailContent
        })
      });
    }

    const successMsg = source === 'guia-30-dias' || source === 'checklist-financeiro'
      ? (lang === 'en' ? 'Sent! Check your email.' : lang === 'es' ? '¡Enviado! Revisa tu email.' : 'Enviado! Verifique seu email.')
      : (lang === 'en' ? 'Subscribed! Check your email.' : lang === 'es' ? '¡Suscrito! Revisa tu email.' : 'Inscrito com sucesso! Verifique seu email.');

    return new Response(JSON.stringify({ message: successMsg }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  const allowedOrigins = siteConfig.allowedOrigins;
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function getWelcomeEmailHTML(email, lang = 'pt') {
  const texts = {
    pt: {
      title: 'Bem-vindo à Newsletter ${siteConfig.brandName}!',
      subtitle: 'Você agora receberá as melhores dicas de finanças pessoais toda semana.',
      listTitle: 'O que você vai receber:',
      items: '✓ Dicas práticas de controle financeiro<br>✓ Resumo semanal de cotações (USD, EUR, BTC)<br>✓ Ferramentas e calculadoras exclusivas<br>✓ Novos termos do glossário financeiro',
      cta: 'Conhecer o App ${siteConfig.brandName}',
      unsub: 'Não quer mais receber?',
      unsubLink: 'Cancelar inscrição'
    },
    en: {
      title: 'Welcome to ${siteConfig.brandName} Newsletter!',
      subtitle: 'You will now receive the best personal finance tips every week.',
      listTitle: 'What you will receive:',
      items: '✓ Practical financial control tips<br>✓ Weekly exchange rate summary (USD, EUR, BTC)<br>✓ Exclusive tools and calculators<br>✓ New financial glossary terms',
      cta: 'Discover FinMoovi App',
      unsub: "Don't want to receive anymore?",
      unsubLink: 'Unsubscribe'
    },
    es: {
      title: '¡Bienvenido a la Newsletter ${siteConfig.brandName}!',
      subtitle: 'Ahora recibirás los mejores consejos de finanzas personales cada semana.',
      listTitle: 'Lo que recibirás:',
      items: '✓ Consejos prácticos de control financiero<br>✓ Resumen semanal de cotizaciones (USD, EUR, BTC)<br>✓ Herramientas y calculadoras exclusivas<br>✓ Nuevos términos del glosario financiero',
      cta: 'Conocer la App ${siteConfig.brandName}',
      unsub: '¿No quieres recibir más?',
      unsubLink: 'Cancelar suscripción'
    }
  };
  const t = texts[lang] || texts.pt;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;">
      <h1 style="color:#f0f6fc;font-size:24px;margin-bottom:16px;">${t.title}</h1>
      <p style="color:#8b949e;font-size:16px;line-height:1.6;margin-bottom:24px;">${t.subtitle}</p>
      <div style="background:#21262d;border-radius:8px;padding:20px;margin-bottom:24px;text-align:left;">
        <p style="color:#f0f6fc;font-size:14px;margin-bottom:8px;font-weight:600;">${t.listTitle}</p>
        <p style="color:#8b949e;font-size:14px;line-height:1.8;margin:0;">${t.items}</p>
      </div>
      <a href="${siteConfig.appUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,${siteConfig.colors.gradientStart},${siteConfig.colors.gradientEnd});color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">${t.cta}</a>
      <p style="color:#6e7681;font-size:12px;margin-top:24px;">
        ${t.unsub} <a href="${siteConfig.siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#58a6ff;">${t.unsubLink}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function getLeadMagnetSubject(lang, source) {
  const subjects = {
    'guia-30-dias': {
      pt: '📘 Seu Guia: 30 Dias para Organizar suas Finanças',
      en: '📘 Your Guide: 30 Days to Organize Your Finances',
      es: '📘 Tu Guía: 30 Días para Organizar tus Finanzas'
    },
    'checklist-financeiro': {
      pt: '✅ Seu Checklist: Independência Financeira',
      en: '✅ Your Checklist: Financial Independence',
      es: '✅ Tu Checklist: Independencia Financiera'
    }
  };
  return (subjects[source] && subjects[source][lang]) || subjects[source]?.pt || 'Seu material gratuito ${siteConfig.brandName}';
}

function getLeadMagnetEmailHTML(email, lang, source) {
  const content = {
    'guia-30-dias': {
      pt: {
        title: 'Seu Guia: 30 Dias para Organizar suas Finanças',
        intro: 'Obrigado por baixar! Aqui está seu guia completo com o desafio de 30 dias.',
        sections: [
          { week: 'Semana 1 (Dias 1-7): Mapeie sua situação', items: ['Dia 1: Liste todas as fontes de renda', 'Dia 2: Anote todos os gastos fixos', 'Dia 3: Registre gastos variáveis dos últimos 3 meses', 'Dia 4: Calcule seu patrimônio líquido (o que tem - o que deve)', 'Dia 5: Identifique assinaturas e serviços que não usa', 'Dia 6: Categorize seus gastos (moradia, alimentação, transporte, lazer)', 'Dia 7: Calcule quanto sobra (ou falta) por mês'] },
          { week: 'Semana 2 (Dias 8-14): Monte seu orçamento', items: ['Dia 8: Defina sua meta de poupança (mínimo 10%)', 'Dia 9: Aplique a regra 50-30-20 na sua renda', 'Dia 10: Defina limites para cada categoria de gasto', 'Dia 11: Configure alertas de limite no ${siteConfig.brandName}', 'Dia 12: Automatize pagamentos de contas fixas', 'Dia 13: Crie uma conta separada para reserva', 'Dia 14: Transfira o valor de poupança no dia do salário'] },
          { week: 'Semana 3 (Dias 15-21): Elimine desperdícios', items: ['Dia 15: Cancele assinaturas não utilizadas', 'Dia 16: Negocie plano de celular e internet', 'Dia 17: Compare preços de supermercado (lista semanal)', 'Dia 18: Substitua delivery por marmita 3x/semana', 'Dia 19: Renegocie dívidas com maior juros', 'Dia 20: Estabeleça regra de 48h para compras não planejadas', 'Dia 21: Calcule quanto economizou nesta semana'] },
          { week: 'Semana 4 (Dias 22-30): Automatize e invista', items: ['Dia 22: Configure investimento automático mensal', 'Dia 23: Abra conta em corretora (se ainda não tem)', 'Dia 24: Faça primeiro aporte em renda fixa', 'Dia 25: Defina 3 metas financeiras para o próximo ano', 'Dia 26: Revise e ajuste seu orçamento com base nas 3 semanas', 'Dia 27: Configure revisão semanal de 5 minutos', 'Dia 28: Compartilhe o plano com alguém de confiança', 'Dia 29: Calcule onde estará em 1 ano mantendo o hábito', 'Dia 30: Celebre! Você criou um sistema que funciona'] }
        ],
        cta: 'Acompanhe seu progresso no ${siteConfig.brandName}',
        bonus: 'Dica extra: Use o ${siteConfig.brandName} para registrar cada gasto em tempo real. A categorização automática por IA economiza horas de trabalho manual.'
      },
      en: {
        title: 'Your Guide: 30 Days to Organize Your Finances',
        intro: 'Thanks for downloading! Here is your complete 30-day challenge guide.',
        sections: [
          { week: 'Week 1 (Days 1-7): Map your situation', items: ['Day 1: List all income sources', 'Day 2: Note all fixed expenses', 'Day 3: Record variable expenses from the last 3 months', 'Day 4: Calculate net worth (assets - debts)', 'Day 5: Identify unused subscriptions and services', 'Day 6: Categorize spending (housing, food, transport, leisure)', 'Day 7: Calculate monthly surplus or deficit'] },
          { week: 'Week 2 (Days 8-14): Build your budget', items: ['Day 8: Set savings goal (minimum 10%)', 'Day 9: Apply the 50-30-20 rule to your income', 'Day 10: Set limits for each spending category', 'Day 11: Set up limit alerts in ${siteConfig.brandName}', 'Day 12: Automate fixed bill payments', 'Day 13: Create a separate savings account', 'Day 14: Transfer savings on payday'] },
          { week: 'Week 3 (Days 15-21): Eliminate waste', items: ['Day 15: Cancel unused subscriptions', 'Day 16: Negotiate phone and internet plans', 'Day 17: Compare grocery prices (weekly list)', 'Day 18: Replace delivery with meal prep 3x/week', 'Day 19: Renegotiate highest-interest debts', 'Day 20: Establish 48h rule for unplanned purchases', 'Day 21: Calculate savings for this week'] },
          { week: 'Week 4 (Days 22-30): Automate and invest', items: ['Day 22: Set up automatic monthly investment', 'Day 23: Open brokerage account (if you haven\'t)', 'Day 24: Make first fixed-income deposit', 'Day 25: Define 3 financial goals for next year', 'Day 26: Review and adjust budget based on 3 weeks', 'Day 27: Set up 5-minute weekly review', 'Day 28: Share plan with someone you trust', 'Day 29: Calculate where you\'ll be in 1 year', 'Day 30: Celebrate! You built a system that works'] }
        ],
        cta: 'Track your progress with ${siteConfig.brandName}',
        bonus: 'Pro tip: Use FinMoovi to log every expense in real time. AI auto-categorization saves hours of manual work.'
      },
      es: {
        title: 'Tu Guía: 30 Días para Organizar tus Finanzas',
        intro: '¡Gracias por descargar! Aquí está tu guía completa del desafío de 30 días.',
        sections: [
          { week: 'Semana 1 (Días 1-7): Mapea tu situación', items: ['Día 1: Lista todas las fuentes de ingreso', 'Día 2: Anota todos los gastos fijos', 'Día 3: Registra gastos variables de los últimos 3 meses', 'Día 4: Calcula tu patrimonio neto (activos - deudas)', 'Día 5: Identifica suscripciones y servicios no usados', 'Día 6: Categoriza gastos (vivienda, alimentación, transporte, ocio)', 'Día 7: Calcula cuánto sobra (o falta) por mes'] },
          { week: 'Semana 2 (Días 8-14): Arma tu presupuesto', items: ['Día 8: Define tu meta de ahorro (mínimo 10%)', 'Día 9: Aplica la regla 50-30-20 a tu ingreso', 'Día 10: Define límites para cada categoría', 'Día 11: Configura alertas de límite en ${siteConfig.brandName}', 'Día 12: Automatiza pagos de cuentas fijas', 'Día 13: Crea una cuenta separada para reserva', 'Día 14: Transfiere el ahorro el día del salario'] },
          { week: 'Semana 3 (Días 15-21): Elimina desperdicios', items: ['Día 15: Cancela suscripciones no usadas', 'Día 16: Negocia plan de celular e internet', 'Día 17: Compara precios de supermercado', 'Día 18: Sustituye delivery por comida casera 3x/semana', 'Día 19: Renegocia deudas con mayor interés', 'Día 20: Establece regla de 48h para compras no planificadas', 'Día 21: Calcula cuánto ahorraste esta semana'] },
          { week: 'Semana 4 (Días 22-30): Automatiza e invierte', items: ['Día 22: Configura inversión automática mensual', 'Día 23: Abre cuenta de inversión', 'Día 24: Haz primer aporte en renta fija', 'Día 25: Define 3 metas financieras para el próximo año', 'Día 26: Revisa y ajusta presupuesto con base en 3 semanas', 'Día 27: Configura revisión semanal de 5 minutos', 'Día 28: Comparte el plan con alguien de confianza', 'Día 29: Calcula dónde estarás en 1 año', 'Día 30: ¡Celebra! Creaste un sistema que funciona'] }
        ],
        cta: 'Acompaña tu progreso en ${siteConfig.brandName}',
        bonus: 'Consejo extra: Usa FinMoovi para registrar cada gasto en tiempo real. La categorización automática por IA ahorra horas de trabajo manual.'
      }
    },
    'checklist-financeiro': {
      pt: {
        title: 'Seu Checklist: Independência Financeira',
        intro: 'Aqui está seu checklist com 50 marcos rumo à liberdade financeira. Marque cada conquista!',
        phases: [
          { name: '🔴 Fase 1: Sobrevivência', items: ['Listar todas as dívidas', 'Parar de criar dívidas novas', 'Negociar dívidas com maior juros', 'Quitar cartão de crédito', 'Quitar cheque especial', 'Montar orçamento mensal', 'Cortar gastos supérfluos', 'Conseguir renda extra', 'Quitar todas as dívidas ruins', 'Ter 1 mês de gastos guardado', 'Ter conta corrente sem taxa', 'Ter zero de saldo negativo'] },
          { name: '🟡 Fase 2: Estabilidade', items: ['Reserva de 2 meses', 'Reserva de 3 meses', 'Reserva de 6 meses', 'Seguro de vida básico', 'Plano de saúde adequado', 'Orçamento funcionando há 3+ meses', 'Zero dívidas (exceto imóvel)', 'Conta separada para investimentos', 'Educação financeira contínua', 'Renda cobrindo 100% dos gastos com folga'] },
          { name: '🔵 Fase 3: Acumulação', items: ['Primeiro investimento em renda fixa', 'Investir todo mês sem falhar', 'Atingir R$ 10k investidos', 'Diversificar: renda fixa + variável', 'Atingir R$ 50k investidos', 'Primeira renda passiva (dividendos/juros)', 'Atingir R$ 100k investidos', 'Investimento mensal > 20% da renda', 'Atingir R$ 250k investidos', 'Renda passiva > R$ 500/mês', 'Patrimônio = 5x renda anual', 'Atingir R$ 500k investidos', 'Múltiplas fontes de renda', 'Renda passiva > R$ 1.500/mês', 'Patrimônio = 10x renda anual'] },
          { name: '🟢 Fase 4: Liberdade', items: ['Renda passiva > 50% dos gastos', 'Patrimônio = 15x renda anual', 'Renda passiva > 75% dos gastos', 'Patrimônio = 20x renda anual', 'Renda passiva = 100% dos gastos', 'Patrimônio = 25x gastos anuais (regra dos 4%)', 'Trabalha porque quer, não porque precisa', 'Ajuda outros a alcançar liberdade financeira', 'Legado: patrimônio transcende gerações', 'Renda passiva > 150% dos gastos (margem de segurança)', 'Filantropia ativa', 'Vida financeira 100% automatizada', 'Paz financeira total'] }
        ],
        cta: 'Acompanhe seu progresso no ${siteConfig.brandName}',
        bonus: 'Dica: Não tente pular fases. Cada marco construído fortalece a base para o próximo. Use o ${siteConfig.brandName} para acompanhar seu patrimônio e renda passiva em tempo real.'
      },
      en: {
        title: 'Your Checklist: Financial Independence',
        intro: 'Here is your checklist with 50 milestones towards financial freedom. Check each achievement!',
        phases: [
          { name: '🔴 Phase 1: Survival', items: ['List all debts', 'Stop creating new debt', 'Negotiate highest-interest debts', 'Pay off credit card', 'Pay off overdraft', 'Create monthly budget', 'Cut unnecessary expenses', 'Find extra income', 'Pay off all bad debts', 'Save 1 month of expenses', 'Get fee-free checking account', 'Zero negative balance'] },
          { name: '🟡 Phase 2: Stability', items: ['2-month emergency fund', '3-month emergency fund', '6-month emergency fund', 'Basic life insurance', 'Adequate health plan', 'Budget working for 3+ months', 'Zero debt (except mortgage)', 'Separate investment account', 'Continuous financial education', 'Income covering 100% of expenses comfortably'] },
          { name: '🔵 Phase 3: Accumulation', items: ['First fixed-income investment', 'Invest every month without fail', 'Reach $10k invested', 'Diversify: fixed + variable income', 'Reach $50k invested', 'First passive income (dividends/interest)', 'Reach $100k invested', 'Monthly investment > 20% of income', 'Reach $250k invested', 'Passive income > $500/month', 'Net worth = 5x annual income', 'Reach $500k invested', 'Multiple income sources', 'Passive income > $1,500/month', 'Net worth = 10x annual income'] },
          { name: '🟢 Phase 4: Freedom', items: ['Passive income > 50% of expenses', 'Net worth = 15x annual income', 'Passive income > 75% of expenses', 'Net worth = 20x annual income', 'Passive income = 100% of expenses', 'Net worth = 25x annual expenses (4% rule)', 'Work because you want to, not because you need to', 'Help others achieve financial freedom', 'Legacy: wealth transcends generations', 'Passive income > 150% of expenses (safety margin)', 'Active philanthropy', 'Financial life 100% automated', 'Total financial peace'] }
        ],
        cta: 'Track your progress with ${siteConfig.brandName}',
        bonus: 'Tip: Don\'t try to skip phases. Each milestone strengthens the foundation for the next. Use FinMoovi to track your net worth and passive income in real time.'
      },
      es: {
        title: 'Tu Checklist: Independencia Financiera',
        intro: '¡Aquí está tu checklist con 50 hitos rumbo a la libertad financiera. Marca cada logro!',
        phases: [
          { name: '🔴 Fase 1: Supervivencia', items: ['Listar todas las deudas', 'Dejar de crear deudas nuevas', 'Negociar deudas con mayor interés', 'Pagar tarjeta de crédito', 'Pagar sobregiro', 'Crear presupuesto mensual', 'Cortar gastos innecesarios', 'Conseguir ingreso extra', 'Pagar todas las deudas malas', 'Guardar 1 mes de gastos', 'Tener cuenta sin comisiones', 'Cero saldo negativo'] },
          { name: '🟡 Fase 2: Estabilidad', items: ['Reserva de 2 meses', 'Reserva de 3 meses', 'Reserva de 6 meses', 'Seguro de vida básico', 'Plan de salud adecuado', 'Presupuesto funcionando 3+ meses', 'Cero deudas (excepto hipoteca)', 'Cuenta separada para inversiones', 'Educación financiera continua', 'Ingreso cubriendo 100% de gastos con holgura'] },
          { name: '🔵 Fase 3: Acumulación', items: ['Primera inversión en renta fija', 'Invertir cada mes sin faltar', 'Alcanzar $10k invertidos', 'Diversificar: renta fija + variable', 'Alcanzar $50k invertidos', 'Primera renta pasiva (dividendos/intereses)', 'Alcanzar $100k invertidos', 'Inversión mensual > 20% del ingreso', 'Alcanzar $250k invertidos', 'Renta pasiva > $500/mes', 'Patrimonio = 5x ingreso anual', 'Alcanzar $500k invertidos', 'Múltiples fuentes de ingreso', 'Renta pasiva > $1.500/mes', 'Patrimonio = 10x ingreso anual'] },
          { name: '🟢 Fase 4: Libertad', items: ['Renta pasiva > 50% de gastos', 'Patrimonio = 15x ingreso anual', 'Renta pasiva > 75% de gastos', 'Patrimonio = 20x ingreso anual', 'Renta pasiva = 100% de gastos', 'Patrimonio = 25x gastos anuales (regla del 4%)', 'Trabaja porque quiere, no porque necesita', 'Ayuda a otros a alcanzar libertad financiera', 'Legado: patrimonio trasciende generaciones', 'Renta pasiva > 150% de gastos (margen de seguridad)', 'Filantropía activa', 'Vida financiera 100% automatizada', 'Paz financiera total'] }
        ],
        cta: 'Acompaña tu progreso en ${siteConfig.brandName}',
        bonus: 'Consejo: No intentes saltar fases. Cada hito fortalece la base para el siguiente. Usa FinMoovi para acompañar tu patrimonio y renta pasiva en tiempo real.'
      }
    }
  };

  const c = (content[source] && content[source][lang]) || content[source]?.pt;
  if (!c) return getWelcomeEmailHTML(email, lang);

  let sectionsHTML = '';
  if (source === 'guia-30-dias') {
    sectionsHTML = c.sections.map(s =>
      `<div style="margin-bottom:20px;">
        <p style="color:#f0f6fc;font-size:14px;font-weight:700;margin-bottom:8px;">${s.week}</p>
        <ul style="color:#8b949e;font-size:13px;line-height:1.8;margin:0;padding-left:16px;">
          ${s.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`
    ).join('');
  } else {
    sectionsHTML = c.phases.map(p =>
      `<div style="margin-bottom:20px;">
        <p style="color:#f0f6fc;font-size:14px;font-weight:700;margin-bottom:8px;">${p.name}</p>
        <ul style="color:#8b949e;font-size:13px;line-height:1.8;margin:0;padding-left:16px;">
          ${p.items.map(item => `<li>☐ ${item}</li>`).join('')}
        </ul>
      </div>`
    ).join('');
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;">
      <h1 style="color:#f0f6fc;font-size:22px;margin-bottom:12px;text-align:center;">${c.title}</h1>
      <p style="color:#8b949e;font-size:15px;line-height:1.6;margin-bottom:24px;text-align:center;">${c.intro}</p>
      <div style="background:#21262d;border-radius:8px;padding:24px;margin-bottom:24px;">
        ${sectionsHTML}
      </div>
      <p style="color:#3fb950;font-size:13px;font-style:italic;margin-bottom:24px;padding:12px;background:rgba(63,185,80,0.08);border-radius:6px;">${c.bonus}</p>
      <div style="text-align:center;">
        <a href="${siteConfig.appUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,${siteConfig.colors.gradientStart},${siteConfig.colors.gradientEnd});color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">${c.cta}</a>
      </div>
      <p style="color:#6e7681;font-size:11px;margin-top:24px;text-align:center;">
        <a href="${siteConfig.siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#58a6ff;">Cancelar inscrição</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
