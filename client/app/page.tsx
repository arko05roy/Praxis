import HeroFuturistic from "@/components/ui/hero-futuristic";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-hidden flex flex-col items-center justify-center font-sans tracking-tight selection:bg-white selection:text-black">

      {/* Background Graphic */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
        <HeroFuturistic />
      </div>

      {/* Grid / Crosshairs Layout */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Center Crosshair Lines */}
        <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white/10 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>

        {/* Diagonal Lines (simulated with large X) */}
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute top-1/2 left-1/2 w-[200vmax] h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
          <div className="absolute top-1/2 left-1/2 w-[200vmax] h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 -rotate-45"></div>
        </div>

        {/* Circular Guides */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5 opacity-50"></div>
      </div>

      {/* Corner Markers */}
      <div className="absolute inset-0 z-20 pointer-events-none p-8 md:p-12">
        {/* Top Left */}
        <div className="absolute top-8 left-8 w-6 h-6 border-t border-l border-white/40"></div>

        {/* Top Right Info Block */}
        <div className="absolute top-8 right-8 text-[10px] md:text-xs font-mono text-zinc-400 space-y-4 text-right">
          <div>
            <span className="inline-block w-1 h-3 bg-zinc-600 mr-2 align-middle"></span>
            CREATED BY<br />
            <span className="text-white">ALEX GILEV</span>
          </div>
          <div>
            <span className="inline-block w-1 h-3 bg-zinc-600 mr-2 align-middle"></span>
            FOLLOW<br />
            <span className="text-white">@AGENTICUI</span>
          </div>
          <div>
            <span className="inline-block w-1 h-3 bg-zinc-600 mr-2 align-middle"></span>
            LOCATION<br />
            <span className="text-white">MIAMI, FL</span>
          </div>
          <div className="w-6 h-6 border-t border-r border-white/40 ml-auto mt-4"></div>
        </div>

        {/* Bottom Left */}
        <div className="absolute bottom-8 left-8 w-6 h-6 border-b border-l border-white/40"></div>

        {/* Bottom Right */}
        <div className="absolute bottom-8 right-8 w-6 h-6 border-b border-r border-white/40"></div>

        {/* Side Markers */}
        <div className="absolute top-1/2 left-8 w-3 h-px bg-white/40 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-8 h-3 w-px bg-white/40 -translate-y-1/2"></div>

        <div className="absolute top-1/2 right-8 w-3 h-px bg-white/40 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-8 h-3 w-px bg-white/40 -translate-y-1/2"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-30 flex flex-col items-center text-center max-w-4xl px-4 mt-32 md:mt-20">

        <div className="font-mono text-xs md:text-sm text-zinc-500 mb-6 tracking-widest uppercase">
          Coming Q1 2026
        </div>

        <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 leading-[0.9]">
          Praxis
        </h1>

        <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed mb-12">
          The world&apos;s first enterprise-grade design system <br className="hidden md:block" />
          for building scalable agentic experiences.
        </p>

        <button className="group relative px-8 py-3 bg-zinc-900 border border-zinc-800 text-xs md:text-sm font-bold tracking-widest text-white uppercase transition-all hover:bg-zinc-800 hover:border-zinc-700 hover:text-white">
          <span className="relative z-10">Pre-Order</span>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>

      </div>
    </main>
  );
}
