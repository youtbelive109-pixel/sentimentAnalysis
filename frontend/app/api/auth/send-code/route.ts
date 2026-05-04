import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory store for verification codes (in production, use a database/Redis)
const codes = new Map<string, { code: string; expires: number; name: string }>();

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store the code
    codes.set(email, { code, expires, name });

    // Export codes map for verify endpoint
    (globalThis as Record<string, unknown>).__verificationCodes = codes;

    // Create SMTP transporter with Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL || "louatimahdi390@gmail.com",
        pass: process.env.SMTP_PASSWORD || "vtjb rtop rbfd nevr",
      },
    });

    // Send verification email
    await transporter.sendMail({
      from: `"Zenith Chat" <${process.env.SMTP_EMAIL || "louatimahdi390@gmail.com"}>`,
      to: email,
      subject: "Your Zenith Chat Verification Code",
      html: `
        <div style="font-family: 'Inter', sans-serif; background-color: #F2F0EB; padding: 40px; text-align: center;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border: 1px solid rgba(0,0,0,0.1);">
            <h1 style="font-family: 'Fraunces', serif; font-size: 28px; color: #1C1C1B; margin-bottom: 8px;">ZENITH.</h1>
            <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Your verification code</p>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 32px; letter-spacing: 8px; background: #F2F0EB; padding: 16px; border: 1px dashed #ccc; margin-bottom: 24px;">
              ${code}
            </div>
            <p style="color: #999; font-size: 12px;">This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
