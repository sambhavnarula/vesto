import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthCode } from "@/lib/upstox";

export const dynamic = "force-dynamic";

/**
 * POST /api/token/auth
 * Body: { code: "XXXX" }
 * Exchanges an auth code for access + refresh tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing authorization code" },
        { status: 400 }
      );
    }

    const tokens = await exchangeAuthCode(code);

    return NextResponse.json({
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: (tokens as any).refresh_token || null,
        expires_in: (tokens as any).expires_in || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
