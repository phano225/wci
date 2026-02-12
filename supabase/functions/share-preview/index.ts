// Supabase Edge Function to serve Open Graph meta tags for articles
// Deploy with: supabase functions deploy share-preview

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const articleId = url.searchParams.get('id')
    const redirectUrl = url.searchParams.get('redirect') || 'https://wci-news.com' // Replace with your actual domain

    if (!articleId) {
      return new Response('Article ID is required', { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch article data
    const { data: article, error } = await supabase
      .from('articles')
      .select('title, excerpt, imageUrl, slug')
      .eq('id', articleId)
      .single()

    if (error || !article) {
      console.error('Error fetching article:', error)
      // Redirect to home if article not found
      return new Response(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}" /></head><body>Redirecting...</body></html>`, {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Construct full image URL if relative
    let imageUrl = article.imageUrl
    if (imageUrl && !imageUrl.startsWith('http')) {
        // Assume it's a storage path or relative path, fallback to default or construct full URL
        // For now, if it's relative, we might not be able to resolve it without knowing the base, 
        // but typically images in DB are full URLs or storage paths.
        // If it's a storage path (e.g. "articles/image.jpg"), we need the public URL.
        // This is simplified.
    }

    // Default to a placeholder if no image
    if (!imageUrl) {
        imageUrl = 'https://wci-news.com/logo.png' // Replace with your default OG image
    }

    const pageTitle = article.title.replace(/"/g, '&quot;')
    const pageDescription = (article.excerpt || '').replace(/"/g, '&quot;')
    const targetUrl = `${redirectUrl}/article/${articleId}`

    // Return HTML with Open Graph tags
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${pageTitle}</title>
          <meta name="description" content="${pageDescription}">
          
          <!-- Open Graph / Facebook -->
          <meta property="og:type" content="article">
          <meta property="og:url" content="${targetUrl}">
          <meta property="og:title" content="${pageTitle}">
          <meta property="og:description" content="${pageDescription}">
          <meta property="og:image" content="${imageUrl}">

          <!-- Twitter -->
          <meta property="twitter:card" content="summary_large_image">
          <meta property="twitter:url" content="${targetUrl}">
          <meta property="twitter:title" content="${pageTitle}">
          <meta property="twitter:description" content="${pageDescription}">
          <meta property="twitter:image" content="${imageUrl}">
          
          <!-- Redirect to actual page for humans -->
          <meta http-equiv="refresh" content="0;url=${targetUrl}" />
        </head>
        <body>
          <p>Redirection vers <a href="${targetUrl}">${pageTitle}</a>...</p>
          <script>window.location.href = "${targetUrl}"</script>
        </body>
      </html>
    `

    return new Response(html, {
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders
      },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
