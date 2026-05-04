import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    const codes = (globalThis as Record<string, unknown>).__verificationCodes as
      | Map<string, { code: string; expires: number; name: string }>
      | undefined;

    if (!codes) {
      return NextResponse.json(
        { error: "No verification codes found. Please request a new code." },
        { status: 400 }
      );
    }

    const stored = codes.get(email);

    if (!stored) {
      return NextResponse.json(
        { error: "No code found for this email. Please request a new code." },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      codes.delete(email);
      return NextResponse.json(
        { error: "Code expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // Code is valid - clean up
    const name = stored.name;
    codes.delete(email);

    return NextResponse.json({
      success: true,
      user: { email, name },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
