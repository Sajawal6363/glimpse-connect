import { useState } from "react";
import { Gamepad2, Play, Trophy, Target, Zap, Flame, Crown, Rocket, Star, ChevronRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const Gaming = () => {
  return (
    <AppLayout>
      <div className="min-h-screen bg-[#030308] relative overflow-hidden font-sans selection:bg-cyan-500/30">
        
        {/* Background Ambient Grid & Glows */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-0 right-0 w-[80vw] h-[80vw] rounded-full bg-cyan-900/10 blur-[120px] -translate-y-1/2 translate-x-1/4" />
           <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] rounded-full bg-purple-900/10 blur-[120px] translate-y-1/3 -translate-x-1/4" />
           <div className="absolute inset-0"
             style={{
               backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
               backgroundSize: "50px 50px",
               backgroundPosition: "center center",
               maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)"
             }}
           />
        </div>

        {/* Global Hub Navigation / Player Banner */}
        <div className="relative z-10 w-full border-b border-white/5 bg-black/20 backdrop-blur-xl">
           <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] border border-cyan-400/50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 rotate-45 translate-x-4"></div>
                    <Gamepad2 className="w-6 h-6 text-white relative z-10" />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-wider">GLIMPSE <span className="text-cyan-400">ARCADE</span></h1>
                    <p className="text-xs text-cyan-400/80 font-bold uppercase tracking-widest flex items-center gap-1">Season 1 Active <Flame className="w-3 h-3 text-orange-500 fill-orange-500" /></p>
                 </div>
              </div>
              <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                 <div className="text-center">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Global Rank</p>
                    <p className="text-sm font-black text-yellow-400 flex items-center justify-center gap-1"><Crown className="w-4 h-4" /> Unranked</p>
                 </div>
                 <div className="w-px h-8 bg-white/10"></div>
                 <div className="text-center">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Total XP</p>
                    <p className="text-sm font-black text-cyan-400 flex items-center justify-center gap-1"><Zap className="w-4 h-4 fill-cyan-400" /> 0</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 lg:p-10 relative z-10 space-y-12">
          
          {/* Featured Title */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-white italic tracking-tight">FEATURED <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">PLAYLIST</span></h2>
              <p className="text-white/50 mt-2 font-medium text-lg">Select a game to enter the arena.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white/40 font-bold text-sm tracking-widest uppercase hover:text-white cursor-pointer transition-colors">
               View Leaderboards <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Cyber Reflex Game Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link
              to="/gaming/cyber-reflex"
              className="group block relative w-full rounded-[2.5rem] bg-black/40 border border-white/10 hover:border-cyan-500/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(34,211,238,0.2)]"                 
            >
              {/* Image / Art Container */}
              <div className="h-[280px] w-full bg-[#050814] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#050814] via-transparent to-transparent z-10" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3 transition-all group-hover:bg-cyan-400/30" />
                <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-700" style={{ backgroundImage: `radial-gradient(circle at center, transparent 0%, #000 100%), linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`, backgroundSize: "100% 100%, 40px 40px, 40px 40px", backgroundPosition: "center center" }} />

                {/* Custom Art */}
                <div className="absolute top-1/4 left-[15%] w-16 h-16 rounded-full border border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center group-hover:scale-[1.3] transition-transform duration-700 z-10">
                   <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute bottom-[20%] right-[20%] w-10 h-10 rounded-full border border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center z-10 opacity-60">
                   <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                </div>
                
                <Target className="w-28 h-28 text-cyan-400 relative z-20 group-hover:scale-110 group-hover:rotate-90 transition-all duration-700 drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]" strokeWidth={1} />
                
                <div className="absolute top-6 left-6 flex gap-2 z-20">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-4 py-1.5 font-black uppercase tracking-widest backdrop-blur-md">
                    Featured
                  </Badge>
                </div>
              </div>

              {/* Data Container */}
              <div className="p-8 lg:p-10 relative z-20">
                <h3 className="text-3xl lg:text-4xl font-black italic tracking-tight text-white mb-4 group-hover:text-cyan-400 transition-colors drop-shadow-md">
                  CYBER REFLEX
                </h3>
                <p className="text-white/60 text-lg leading-relaxed mb-8">
                  Test your reaction time in this high-speed tactical aim trainer. Hit sequential targets rapidly to build maximum combo multipliers!
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                     <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Category</p>
                     <p className="text-white font-bold flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /> Aim Trainer</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="flex flex-col gap-1 hidden sm:flex">
                     <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Players</p>
                     <p className="text-white font-bold flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-cyan-400" /> Single</p>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block" />
                  <div className="flex items-center justify-center">
                    <span className="flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-sm group-hover:bg-cyan-400 group-hover:scale-105 transition-all group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]">
                      Play Now <Play className="w-4 h-4 fill-black" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
            </motion.div>

            {/* Aura Sort Game Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Link
              to="/gaming/find-diff"
              className="group block relative w-full rounded-[2.5rem] bg-black/40 border border-white/10 hover:border-purple-500/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(168,85,247,0.2)]"
            >
              {/* Image / Art Container */}
              <div className="h-[280px] w-full bg-[#0a0515] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0515] via-transparent to-transparent z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px] -z-10 -translate-x-1/4 translate-y-1/4 transition-all group-hover:bg-purple-500/30" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-60" />
                  
                {/* Custom Thumbnail Art: Bottles with glowing balls */}
                <div className="flex gap-4 relative z-20 group-hover:scale-[1.15] transition-transform duration-700 mt-4">
                  <div className="w-12 h-32 border-x-[3px] border-b-[3px] border-white/20 rounded-b-2xl rounded-t-md flex flex-col-reverse p-[3px] items-center bg-gradient-to-b from-white/5 to-white/10 relative shadow-inner">
                     <div className="absolute -top-2 w-[120%] h-3 border-[3px] border-white/20 rounded-[100%] bg-transparent z-10" />
                     <div className="w-9 h-9 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] my-[1px]" />
                     <div className="w-9 h-9 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] my-[1px]" />
                  </div>
                  <div className="w-12 h-32 border-x-[3px] border-b-[3px] border-white/20 rounded-b-2xl rounded-t-md flex flex-col-reverse p-[3px] items-center bg-gradient-to-b from-white/5 to-white/10 relative shadow-inner">
                     <div className="absolute -top-2 w-[120%] h-3 border-[3px] border-white/20 rounded-[100%] bg-transparent z-10" />
                     <div className="w-9 h-9 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] my-[1px]" />
                     <div className="w-9 h-9 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] my-[1px]" />
                  </div>
                  <div className="w-12 h-32 border-x-[3px] border-b-[3px] border-purple-400/50 rounded-b-2xl rounded-t-md flex flex-col-reverse p-[3px] items-center bg-purple-900/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative -translate-y-4 group-hover:-translate-y-8 transition-transform duration-500">
                     <div className="absolute -top-2 w-[120%] h-3 border-[3px] border-white/20 rounded-[100%] bg-transparent z-10" />
                     <div className="w-9 h-9 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] my-[1px]" />
                     <div className="w-9 h-9 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] my-[1px]" />
                  </div>
                </div>

                <div className="absolute top-6 left-6 flex gap-2 z-20">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-1.5 font-black uppercase tracking-widest backdrop-blur-md flex items-center gap-1 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    <Rocket className="w-3 h-3" /> Trending
                  </Badge>
                </div>
              </div>

              {/* Data Container */}
              <div className="p-8 lg:p-10 relative z-20">
                <h3 className="text-3xl lg:text-4xl font-black italic tracking-tight text-white mb-4 group-hover:text-purple-400 transition-colors drop-shadow-md">
                  AURA SORT
                </h3>
                <p className="text-white/60 text-lg leading-relaxed mb-8">
                  Sort the glowing orbs into their matching glass tubes! An incredibly addictive, easy-to-learn logic puzzle with 50 stages and intense 60-second timers.
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                     <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Category</p>
                     <p className="text-white font-bold flex items-center gap-2"><Star className="w-4 h-4 text-purple-400 fill-purple-400" /> Logic</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="flex flex-col gap-1 hidden sm:flex">
                     <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Stages</p>
                     <p className="text-white font-bold flex items-center gap-2"><Crown className="w-4 h-4 text-purple-400" /> 50 Levels</p>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block" />
                  <div className="flex items-center justify-center">
                    <span className="flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-full font-black uppercase tracking-widest text-sm group-hover:bg-purple-400 group-hover:scale-105 transition-all group-hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                      Play Now <Play className="w-4 h-4 fill-black" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
            </motion.div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Gaming;
