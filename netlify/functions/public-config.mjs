// Delivers only Supabase's public URL and anon key. A service-role key is never read here.
export default async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return Response.json({ configured: false }, { status: 503, headers: { 'cache-control': 'no-store' } });
  return Response.json({ configured: true, url, anonKey }, { headers: { 'cache-control': 'no-store' } });
};
