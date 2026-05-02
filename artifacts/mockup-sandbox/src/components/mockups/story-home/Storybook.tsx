import React from 'react';

export function Storybook() {
  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col items-center"
      style={{
        backgroundColor: "#FFF8E7", 
        fontFamily: "'Nunito', sans-serif",
        backgroundImage: 'radial-gradient(#FDEBCA 2px, transparent 2px)',
        backgroundSize: '30px 30px'
      }}
    >
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap" rel="stylesheet" />

      {/* Decorative stars / shapes */}
      <div className="absolute top-10 left-10 text-4xl animate-pulse" style={{ color: "#FFB84D" }}>⭐</div>
      <div className="absolute top-32 right-16 text-3xl animate-bounce" style={{ color: "#FF9E80" }}>♥</div>
      <div className="absolute top-64 left-24 text-2xl" style={{ color: "#82C3DF" }}>📚</div>
      <div className="absolute bottom-20 right-24 text-4xl animate-pulse" style={{ color: "#FFB84D" }}>⭐</div>

      {/* Header Banner */}
      <header className="w-full max-w-4xl mx-auto pt-16 px-6 text-center z-10">
        <div className="relative inline-block mb-4">
          <h1 
            className="text-6xl md:text-8xl font-bold tracking-wide relative z-10"
            style={{ 
              fontFamily: "'Caveat', cursive",
              color: "#E65C40",
              textShadow: "2px 2px 0px #FFF, 4px 4px 0px #FFB84D"
            }}
          >
            Story Together
          </h1>
          <svg className="absolute -bottom-4 left-0 w-full h-6 text-[#FFB84D] -z-10 opacity-70" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M0,10 Q50,20 100,10 L100,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>
        
        <p className="text-xl md:text-2xl text-amber-900 font-semibold mb-10 opacity-90">
          Every story starts with you! 📖
        </p>

        {/* Primary Action Button */}
        <button 
          className="group relative inline-flex items-center justify-center px-8 py-4 text-2xl font-bold text-white transition-transform duration-300 hover:-translate-y-2 hover:scale-105 active:translate-y-1"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          <span className="absolute inset-0 w-full h-full rounded-full bg-[#E65C40] border-4 border-white shadow-[0_8px_0_0_#C54A32,0_15px_20px_rgba(0,0,0,0.15)] group-hover:shadow-[0_12px_0_0_#C54A32,0_20px_25px_rgba(0,0,0,0.2)] group-active:shadow-[0_4px_0_0_#C54A32,0_5px_10px_rgba(0,0,0,0.1)] transition-all duration-300"></span>
          <span className="relative flex items-center gap-2">
            ✨ Write a Story! ✨
          </span>
        </button>
      </header>

      {/* Story Cards Section */}
      <main className="w-full max-w-5xl mx-auto mt-20 px-6 pb-24 z-10">
        <div className="flex items-center justify-center gap-4 mb-10 text-[#E65C40]">
          <span className="text-2xl">〰️</span>
          <h2 className="text-4xl font-bold" style={{ fontFamily: "'Caveat', cursive" }}>Read a Sample</h2>
          <span className="text-2xl">〰️</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <StoryCard 
            title="The Brave Little Teapot's Big Adventure"
            color="#82C3DF"
            emoji="🫖"
            rotation="-2deg"
          />
          {/* Card 2 */}
          <StoryCard 
            title="Milo and the Rainbow Dragon"
            color="#FF9E80"
            emoji="🐉"
            rotation="1deg"
          />
          {/* Card 3 */}
          <StoryCard 
            title="The Secret Garden of Talking Flowers"
            color="#FFB84D"
            emoji="🌻"
            rotation="-1deg"
          />
        </div>
      </main>
      
    </div>
  );
}

function StoryCard({ title, color, emoji, rotation }: { title: string, color: string, emoji: string, rotation: string }) {
  return (
    <div 
      className="relative flex flex-col p-6 bg-[#FFFCF5] rounded-xl border-4 border-dashed transition-transform duration-300 hover:scale-105 hover:z-10 cursor-pointer"
      style={{ 
        borderColor: color,
        transform: `rotate(${rotation})`,
        boxShadow: `5px 5px 0px ${color}30`
      }}
    >
      {/* Bookmark Ribbon */}
      <div 
        className="absolute -top-2 right-6 w-8 h-12 shadow-sm z-20"
        style={{ 
          backgroundColor: color,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)'
        }}
      ></div>

      <div className="text-5xl mb-4 mt-2 text-center">{emoji}</div>
      
      <h3 
        className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-4 flex-grow leading-tight"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        {title}
      </h3>
      
      <div className="mt-auto pt-4 border-t-2 border-dotted text-center" style={{ borderColor: `${color}50` }}>
        <span className="text-lg font-bold transition-colors" style={{ color: color }}>
          Keep Reading →
        </span>
      </div>
    </div>
  );
}
