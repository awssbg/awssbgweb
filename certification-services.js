/* Global service layer: all personal/exam authority remains in Supabase. */
(async () => {
  const unavailable = message => ({ available: false, reason: message });
  let client = null;
  try {
    let config = window.SBG_SUPABASE_CONFIG;
    if (!config && location.protocol !== 'file:') {
      const response = await fetch('/.netlify/functions/public-config', { cache: 'no-store' });
      if (response.ok) config = await response.json();
    }
    config ||= unavailable('Backend configuration is unavailable.');
    if (!config.url || !config.anonKey) throw new Error('The cloud practice backend has not been configured yet.');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    client = createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (error) { window.sbgBackend = unavailable(error.message); window.dispatchEvent(new Event('sbg-backend-ready')); return; }
  const unwrap = async request => { const { data, error } = await request; if (error) throw error; return data; };
  const mustUser = async () => { const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error('Please sign in to save cloud practice progress.'); return user; };
  window.sbgBackend = {
    available: true, client,
    auth: {
      getSession: () => unwrap(client.auth.getSession()), getCurrentUser: mustUser,
      signUp: ({ email, password, displayName, redirectTo }) => unwrap(client.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: redirectTo } })),
      signIn: ({ email, password }) => unwrap(client.auth.signInWithPassword({ email, password })),
      signOut: () => unwrap(client.auth.signOut()),
      resetPassword: (email, redirectTo) => unwrap(client.auth.resetPasswordForEmail(email, { redirectTo })),
      signInWithGoogle: redirectTo => unwrap(client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })),
      onAuthStateChange: callback => client.auth.onAuthStateChange(callback)
    },
    certifications: {
      list: () => unwrap(client.from('certification_catalog').select('*').eq('active', true).order('level').order('name')),
      get: slug => unwrap(client.from('certification_catalog').select('*').eq('slug', slug).single()),
      domains: certificationId => unwrap(client.from('certification_domains').select('*').eq('certification_id', certificationId).eq('active', true).order('display_order'))
    },
    exams: {
      async create({ certificationSlug, count, mode = 'mock', idempotencyKey = crypto.randomUUID() }) { await mustUser(); return unwrap(client.rpc('create_exam', { p_certification_slug: certificationSlug, p_count: count, p_mode: mode, p_idempotency_key: idempotencyKey })); },
      async get(attemptId) { await mustUser(); return unwrap(client.from('exam_attempts').select('*, certifications(slug,name,short_name), exam_attempt_questions(id,question_order,marked_for_review,question_snapshot,exam_answers(selected_option_ids,answered_at))').eq('id', attemptId).single()); },
      async saveAnswer({ attemptQuestionId, optionIds, markedForReview }) { await mustUser(); return unwrap(client.rpc('save_exam_answer', { p_attempt_question_id: attemptQuestionId, p_option_ids: optionIds || [], p_marked_for_review: markedForReview ?? null })); },
      async submit(attemptId) { await mustUser(); return unwrap(client.rpc('submit_exam', { p_attempt_id: attemptId })); },
      async history() { await mustUser(); return unwrap(client.from('exam_attempts').select('*, certifications(short_name,slug)').in('status', ['submitted', 'expired']).order('submitted_at', { ascending: false })); },
      async active() { await mustUser(); return unwrap(client.from('exam_attempts').select('id, certification_id, certifications(slug,short_name)').eq('status', 'in_progress').gt('expires_at', new Date().toISOString()).order('started_at', { ascending: false }).limit(1)); },
      async result(attemptId) { await mustUser(); return unwrap(client.rpc('get_exam_review', { p_attempt_id: attemptId })); }
    },
    progress: { dashboard: async () => { await mustUser(); return unwrap(client.rpc('my_dashboard')); } },
    saved: {
      async toggle(questionId, enabled) { const user = await mustUser(); return enabled ? unwrap(client.from('saved_questions').upsert({ user_id: user.id, question_id: questionId })) : unwrap(client.from('saved_questions').delete().eq('user_id', user.id).eq('question_id', questionId)); },
      async list() { await mustUser(); return unwrap(client.from('saved_questions').select('question_id,created_at').order('created_at', { ascending: false })); }
    }
  }; window.dispatchEvent(new Event('sbg-backend-ready'));
})();
