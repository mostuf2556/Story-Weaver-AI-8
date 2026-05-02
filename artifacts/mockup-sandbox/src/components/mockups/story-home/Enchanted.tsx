import React from 'react';

export function Enchanted() {
  return (
    <div 
      style={{ fontFamily: "'Baloo 2', cursive" }} 
      className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#0B2E24] via-[#1A4C3A] to-[#E8DCC2] text-[#332211] selection:bg-[#FFD700] selection:text-[#0B2E24]"
    >
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;800&display=swap" rel="stylesheet" />
      
      {/* Decorative Fireflies / Stars */}
      <div className="absolute top-10 left-10 text-yellow-300 text-3xl animate-pulse">✨</div>
      <div className="absolute top-40 right-20 text-yellow-200 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>✨</div>
      <div className="absolute top-20 left-1/2 text-yellow-400 text-2xl animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
      <div className="absolute bottom-40 left-20 text-green-300 text-5xl opacity-50 drop-shadow-lg">🌿</div>
      <div className="absolute top-60 right-10 text-green-400 text-4xl opacity-50 drop-shadow-lg rotate-45">🌿</div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        
        {/* Header Section */}
        <header className="mb-16 animate-in fade-in slide-in-from-top-8 duration-1000">
          <h1 className="text-6xl md:text-8xl font-extrabold text-[#FFD700] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-wide mb-4">
            Story Together
          </h1>
          <p className="text-xl md:text-3xl font-semibold text-[#E8DCC2] drop-shadow-md">
            Write magical tales with a friend! 🧚‍♀️
          </p>
        </header>

        {/* Primary Action */}
        <div className="mb-20 animate-in fade-in zoom-in duration-700 delay-300 fill-mode-both">
          <button className="group relative px-10 py-5 bg-gradient-to-b from-[#FFA500] to-[#FF8C00] text-white text-3xl md:text-4xl font-bold rounded-full shadow-[0_8px_0_#CC7000,0_15px_20px_rgba(0,0,0,0.4)] transition-all active:translate-y-2 active:shadow-[0_0px_0_#CC7000,0_0px_0_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center gap-4">
            <span className="group-hover:rotate-12 transition-transform duration-300">📖</span>
            Start a New Story!
            <span className="absolute -top-3 -right-3 text-yellow-200 text-3xl animate-spin-slow">🌟</span>
          </button>
        </div>

        {/* Story Cards Grid */}
        <div className="w-full">
          <h2 className="text-2xl md:text-4xl font-bold text-[#E8DCC2] mb-8 text-left drop-shadow-md flex items-center gap-3">
            <span>📚</span> Continue your adventures...
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#FFF8E7] rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-[#D4AF37] transform transition-all hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(255,215,0,0.4)] cursor-pointer text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37] opacity-20 rounded-bl-full"></div>
              <h3 className="text-2xl font-bold text-[#5B3E31] mb-2 leading-tight">The Dragon Who Lost His Roar</h3>
              <p className="text-[#8B5A2B] font-medium mb-6">Chapter 3: The Quiet Cave</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-[#1A4C3A] font-bold text-lg group-hover:translate-x-2 transition-transform">
                  Continue <span className="ml-2">→</span>
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FFF8E7] rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-[#D4AF37] transform transition-all hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(255,215,0,0.4)] cursor-pointer text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37] opacity-20 rounded-bl-full"></div>
              <h3 className="text-2xl font-bold text-[#5B3E31] mb-2 leading-tight">Princess of the Sea</h3>
              <p className="text-[#8B5A2B] font-medium mb-6">Chapter 1: The Coral Castle</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-[#1A4C3A] font-bold text-lg group-hover:translate-x-2 transition-transform">
                  Continue <span className="ml-2">→</span>
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FFF8E7] rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-[#D4AF37] transform transition-all hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(255,215,0,0.4)] cursor-pointer text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37] opacity-20 rounded-bl-full"></div>
              <h3 className="text-2xl font-bold text-[#5B3E31] mb-2 leading-tight">The Talking Cloud</h3>
              <p className="text-[#8B5A2B] font-medium mb-6">Chapter 5: Rainy Day Games</p>
              <div className="flex justify-end">
                <span className="inline-flex items-center text-[#1A4C3A] font-bold text-lg group-hover:translate-x-2 transition-transform">
                  Continue <span className="ml-2">→</span>
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>
      
      {/* Ground floor decoration */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#8B5A2B] to-transparent opacity-20"></div>
    </div>
  );
}
