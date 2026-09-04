// Delivers only Supabase's public URL and anon key. A service-role key is never read here.
export default async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { statusCode: 503, body: JSON.stringify({ configured: false }) };
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ configured: true, url, anonKey })
  };
};
