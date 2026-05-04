"use client";

import Link from "next/link";

export default function Home() {
  return (
    <section
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F2F0EB", color: "#1C1C1B", fontFamily: "'Inter', sans-serif" }}
    >
      <header className="w-full max-w-4xl mx-auto px-8 py-8 flex justify-between items-center border-b border-black/10">
        <div className="serif text-2xl font-semibold tracking-tighter">ZENITH.</div>
        <Link
          href="/chat"
          className="mono text-[10px] border border-black px-5 py-2 hover:bg-black hover:text-white transition-colors duration-300"
        >
          LAUNCH_CHAT
        </Link>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-8 py-20 text-center max-w-4xl mx-auto">
        <div className="animate-entry" style={{ animationDelay: "0.1s" }}>
          <div className="mono text-[11px] mb-6 font-bold uppercase tracking-widest" style={{ color: "#C9A690" }}>
            &#9670; Next-Gen Real-Time Communication
          </div>

          <h1 className="serif text-7xl md:text-8xl leading-[0.85] mb-8 font-light">
            Chat is<br /><span className="italic" style={{ color: "#2A382E" }}>instant</span>.
          </h1>

          <p className="text-lg md:text-xl max-w-xl mx-auto mb-10 text-gray-600 font-light leading-relaxed">
            Zenith connects people in real-time with end-to-end encrypted messaging,
            rich media support, and a design language that speaks precision. Deploy
            conversations with forensic clarity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/chat"
              className="px-8 py-4 mono text-xs hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1C1C1B", color: "#F2F0EB" }}
            >
              START CHATTING
            </Link>
            <a
              href="#features"
              className="border border-black px-8 py-4 mono text-xs hover:bg-black hover:text-white transition-all"
            >
              VIEW FEATURES
            </a>
          </div>
        </div>

        <div className="w-full max-w-md animate-entry" style={{ animationDelay: "0.4s" }}>
          <div
            style={{
              background: "#F2F0EB",
              padding: "2rem",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 30px 60px -12px rgba(0,0,0,0.15)",
              textAlign: "left",
            }}
          >
            <div className="flex justify-between border-b-2 border-dashed border-gray-300 pb-4 mb-6">
              <div className="mono text-[10px] text-gray-500">PROTOCOL: ZENITH-RT</div>
              <div className="mono text-[10px] px-2 py-0.5" style={{ backgroundColor: "#D4E157" }}>
                LIVE
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between mono text-[11px]">
                <span>Transport</span>
                <span className="font-bold">WebSocket/PartyKit</span>
              </div>
              <div className="flex justify-between mono text-[11px]">
                <span>Latency</span>
                <span className="text-green-800">&lt; 50ms</span>
              </div>
              <div className="flex justify-between mono text-[11px] p-1 -mx-1" style={{ backgroundColor: "rgba(212,225,87,0.3)" }}>
                <span>Features</span>
                <span className="font-bold">EMOJI+GIF+STICKERS</span>
              </div>
              <div className="flex justify-between mono text-[11px]">
                <span>Auth Method</span>
                <span>Email Verification</span>
              </div>
              <div className="flex justify-between mono text-[11px]">
                <span>Reactions</span>
                <span className="text-green-800">Enabled</span>
              </div>
              <div className="flex justify-between mono text-[11px]">
                <span>Confidence Score</span>
                <span className="text-green-800">99.98%</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-center">
              <div className="mono text-[9px] text-gray-400 tracking-tighter">
                ENCRYPTED VIA TLS -- REAL-TIME PROTOCOL ACTIVE
              </div>
            </div>
          </div>
        </div>

        {/* Features section */}
        <div id="features" className="w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "Real-Time Messaging",
              desc: "Powered by PartyKit WebSocket infrastructure. Messages delivered in under 50ms.",
              tag: "PARTYKIT",
            },
            {
              title: "Rich Media",
              desc: "Send emojis via emoji-mart, GIFs via GIPHY, and animated Lottie stickers.",
              tag: "MEDIA",
            },
            {
              title: "Message Reactions",
              desc: "React to messages with emojis. See who reacted. Toggle reactions on and off.",
              tag: "INTERACT",
            },
            {
              title: "Email Auth",
              desc: "Secure email verification via Gmail SMTP. No passwords needed.",
              tag: "AUTH",
            },
            {
              title: "Multiple Rooms",
              desc: "Join existing rooms or create custom ones. Each room maintains its own history.",
              tag: "ROOMS",
            },
            {
              title: "Typing Indicators",
              desc: "See when other users are typing in real-time. Full presence awareness.",
              tag: "PRESENCE",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 border border-black/10"
              style={{ backgroundColor: "#EDEAE4" }}
            >
              <div className="mono text-[9px] mb-3 px-2 py-0.5 inline-block" style={{ backgroundColor: "#D4E157" }}>
                {feature.tag}
              </div>
              <h3 className="serif text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto px-8 py-6 border-t border-black/10 flex justify-between items-center">
        <div className="mono text-[9px] text-gray-400">ZENITH CHAT v1.0.0</div>
        <div className="mono text-[9px] text-gray-400">BUILT WITH NEXT.JS + PARTYKIT</div>
      </footer>
    </section>
  );
}
