/* Global service layer: all personal/exam authority remains in Supabase. */
(async () => {
  const unavailable = message => ({ available: false, reason: message });
  const getAppOrigin = () => location.protocol === 'file:' ? 'http://localhost:8888' : location.origin;
  const getAuthRedirectUrl = (path = '/certification-practice/auth/callback') => new URL(path, getAppOrigin()).toString();
  let client = null;
  let runtimeConfig = null;
  try {
    let config = window.SBG_SUPABASE_CONFIG;
    if (!config && location.protocol !== 'file:') {
      const response = await fetch('/.netlify/functions/public-config', { cache: 'no-store' });
      if (response.ok) config = await response.json();
    }
    config ||= unavailable('Backend configuration is unavailable.');
    if (!config.url || !config.anonKey) throw new Error('The cloud practice backend has not been configured yet.');
    runtimeConfig = Object.freeze({ url: config.url, anonKey: config.anonKey });
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    client = createClient(runtimeConfig.url, runtimeConfig.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (error) { window.sbgBackend = unavailable(error.message); window.dispatchEvent(new Event('sbg-backend-ready')); return; }
  const unwrap = async request => { const { data, error } = await request; if (error) throw error; return data; };
  const friendlyError = error => { const message=String(error?.message||error||'Unable to complete this request.'); const status=Number(error?.status||0); if(status===429||/rate limit|too many requests/i.test(message))return 'TOO MANY REQUESTS — Please wait before requesting another email.'; if(/provider is not enabled|unsupported provider/i.test(message))return 'Google sign-in is not configured. Please use email sign-in or contact the administrator.'; if(/email not confirmed/i.test(message))return 'Please verify your email address, then sign in.'; if(/invalid login/i.test(message))return 'Email or password is incorrect.'; if(/already registered/i.test(message))return 'An account already exists for this email. Try signing in instead.'; if(/password/i.test(message))return 'Choose a password that meets the required security rules.'; if(/network|fetch/i.test(message))return 'Network connection failed. Please try again.'; return message; };
  const mustUser = async () => { const { data: { user } } = await client.auth.getUser(); if (!user) throw new Error('Please sign in to save cloud practice progress.'); return user; };
  window.sbgBackend = {
    available: true, client,
    auth: {
      getSession: () => unwrap(client.auth.getSession()), getCurrentUser: mustUser,
      signUp: ({ email, password, displayName, redirectTo = getAuthRedirectUrl() }) => unwrap(client.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: redirectTo } })),
      signIn: ({ email, password }) => unwrap(client.auth.signInWithPassword({ email, password })),
      signOut: () => unwrap(client.auth.signOut()),
      resetPassword: (email, redirectTo = getAuthRedirectUrl()) => unwrap(client.auth.resetPasswordForEmail(email, { redirectTo })),
      resendVerification: (email, redirectTo = getAuthRedirectUrl()) => unwrap(client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } })),
      async signInWithGoogle(redirectTo = getAuthRedirectUrl()) { if(!runtimeConfig)throw new Error('Google sign-in failed. Please try again.'); let settings; try { settings=await fetch(`${runtimeConfig.url}/auth/v1/settings`,{headers:{apikey:runtimeConfig.anonKey}}).then(response=>response.ok?response.json():null); } catch { throw new Error('Google sign-in failed. Please try again.'); } if(!settings?.external?.google)throw new Error('Google sign-in is not configured. Please use email sign-in or contact the administrator.'); return unwrap(client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })); },
      onAuthStateChange: callback => client.auth.onAuthStateChange(callback), friendlyError, getAppOrigin, getAuthRedirectUrl
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
    profile: { async get() { const user=await mustUser(); return unwrap(client.from('profiles').select('display_name,avatar_url,created_at').eq('id',user.id).single()); } },
    progress: { dashboard: async () => { await mustUser(); return unwrap(client.rpc('my_dashboard')); } },
    saved: {
      async toggle(questionId, enabled) { const user = await mustUser(); return enabled ? unwrap(client.from('saved_questions').upsert({ user_id: user.id, question_id: questionId })) : unwrap(client.from('saved_questions').delete().eq('user_id', user.id).eq('question_id', questionId)); },
      async list() { await mustUser(); return unwrap(client.from('saved_questions').select('question_id,created_at').order('created_at', { ascending: false })); }
    }
  }; client.auth.onAuthStateChange((event, session) => window.dispatchEvent(new CustomEvent('sbg-auth-state', { detail: { event, session } }))); window.dispatchEvent(new Event('sbg-backend-ready'));
})();
