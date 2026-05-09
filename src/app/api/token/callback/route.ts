import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthCode } from "@/lib/upstox";

export const dynamic = "force-dynamic";

/**
 * GET /api/token/callback?code=XXXX
 * This is the Upstox OAuth redirect endpoint.
 * Set this URL (https://vestroai.com/api/token/callback) as your
 * redirect URI in the Upstox Developer Console.
 *
 * When you visit: https://api.upstox.com/v2/login/authorization/dialog?client_id=...&redirect_uri=https://vestroai.com/api/token/callback&response_type=code
 * Upstox redirects here with ?code=XXXX, we exchange it for tokens.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return new Response(
        `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h1 style="color:red;">❌ No authorization code received</h1>
          <p>Make sure you're being redirected from Upstox.</p>
        </body></html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const tokens = await exchangeAuthCode(code);

    const accessToken = tokens.access_token;
    const refreshToken = (tokens as any).refresh_token || null;

    // In production, store these tokens in your environment
    // For Netlify: update env vars via Netlify API or manually
    // For now, we display them

    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:green;">✅ Token Generated Successfully!</h1>
        <div style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:left;margin-top:20px;">
          <p><strong>Access Token:</strong></p>
          <code style="word-break:break-all;font-size:12px;display:block;margin-bottom:20px;">${accessToken}</code>
          ${refreshToken ? `<p><strong>Refresh Token:</strong></p><code style="word-break:break-all;font-size:12px;display:block;margin-bottom:20px;">${refreshToken}</code>` : "<p>No refresh token provided (Upstox may not support it for this app type).</p>"}
          <p style="color:#666;font-size:14px;">Copy the access token and add it to your Netlify env vars as <strong>UPSTOX_ACCESS_TOKEN</strong>.</p>
          <p style="color:#666;font-size:14px;">Token expires in ~6 hours. Visit the auth URL again to refresh.</p>
        </div>
        <p style="margin-top:30px;">
          <a href="/api/portfolio" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Test Portfolio API →</a>
        </p>
      </body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error: any) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:red;">❌ Error generating token</h1>
        <p style="color:#666;">${error.message}</p>
      </body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
