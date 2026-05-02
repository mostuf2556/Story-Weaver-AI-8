import React from 'react';

export function Space() {
  return (
    <div className="min-h-screen bg-[#050514] text-white relative overflow-hidden font-['Nunito',sans-serif]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Nunito:wght@400;600;800&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{__html: `
        .starfield {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 130px 80px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 160px 120px, #ffffff, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          opacity: 0.5;
          z-index: 0;
          animation: twinkle 5s infinite linear;
        }
        
        .nebula {
          position: absolute;
          top: -20%; left: -10%; right: -10%; bottom: -20%;
          background: 
            radial-gradient(circle at 15% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%);
          z-index: 0;
          pointer-events: none;
        }

        @keyframes twinkle {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }

        .neon-border {
          box-shadow: 0 0 10px rgba(147, 51, 234, 0.5), inset 0 0 10px rgba(147, 51, 234, 0.3);
          border: 1px solid rgba(147, 51, 234, 0.8);
        }

        .neon-button {
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 10px rgba(6, 182, 212, 0.4);
          border: 2px solid rgba(6, 182, 212, 1);
          text-shadow: 0 0 5px rgba(255,255,255,0.5);
          transition: all 0.3s ease;
        }
        
        .neon-button:hover {
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.8), inset 0 0 15px rgba(6, 182, 212, 0.6);
          transform: translateY(-2px) scale(1.02);
        }

        .float {
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}} />

      <div className="starfield"></div>
      <div className="nebula"></div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center min-h-screen">
        
        {/* Header Section */}
        <div className="text-center mb-12 relative">
          <div className="absolute -top-8 -left-12 text-4xl float" style={{ animationDelay: '0s' }}>🪐</div>
          <div className="absolute -top-4 -right-10 text-3xl float" style={{ animationDelay: '1s' }}>✨</div>
          
          <h1 className="font-['Orbitron'] text-5xl md:text-7xl font-black mb-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            STORY TOGETHER
          </h1>
          <p className="text-xl md:text-2xl text-cyan-100 font-semibold tracking-wide">
            Launch your story into the stars! 🚀
          </p>
        </div>

        {/* Primary Action */}
        <button className="neon-button bg-cyan-950/50 text-cyan-300 font-['Orbitron'] font-bold text-2xl md:text-3xl px-10 py-5 rounded-full mb-16 flex items-center gap-4 group cursor-pointer">
          <span className="text-4xl group-hover:rotate-12 transition-transform">🚀</span>
          NEW MISSION!
        </button>

        {/* Mission Logs */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📡</span>
            <h2 className="font-['Orbitron'] text-2xl text-purple-300 font-bold tracking-widest uppercase">
              Mission Logs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="neon-border bg-[#0a0a2a]/80 backdrop-blur-md rounded-2xl p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/20 blur-2xl rounded-full"></div>
              <div className="text-4xl mb-4">👾</div>
              <h3 className="font-['Orbitron'] text-xl font-bold text-white mb-2 leading-tight">
                Attack of the Friendly Aliens
              </h3>
              <p className="text-purple-200/70 text-sm mb-6 flex-grow">
                Sector 7G • Status: Ongoing
              </p>
              <div className="mt-auto flex items-center text-cyan-400 font-bold text-sm group-hover:text-cyan-300 transition-colors uppercase tracking-wider">
                Continue Mission <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="neon-border bg-[#0a0a2a]/80 backdrop-blur-md rounded-2xl p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/20 blur-2xl rounded-full"></div>
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="font-['Orbitron'] text-xl font-bold text-white mb-2 leading-tight">
                Lost on Planet Zogg
              </h3>
              <p className="text-purple-200/70 text-sm mb-6 flex-grow">
                Outer Rim • Status: Pending Rescue
              </p>
              <div className="mt-auto flex items-center text-cyan-400 font-bold text-sm group-hover:text-cyan-300 transition-colors uppercase tracking-wider">
                Continue Mission <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="neon-border bg-[#0a0a2a]/80 backdrop-blur-md rounded-2xl p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/20 blur-2xl rounded-full"></div>
              <div className="text-4xl mb-4">🐕‍🦺</div>
              <h3 className="font-['Orbitron'] text-xl font-bold text-white mb-2 leading-tight">
                The Space Dog Who Saved the Universe
              </h3>
              <p className="text-purple-200/70 text-sm mb-6 flex-grow">
                Canis Major • Status: Triumphant
              </p>
              <div className="mt-auto flex items-center text-cyan-400 font-bold text-sm group-hover:text-cyan-300 transition-colors uppercase tracking-wider">
                Continue Mission <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
