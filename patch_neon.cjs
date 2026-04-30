const fs = require('fs');
let code = fs.readFileSync('src/pages/NeonStrike.tsx', 'utf8');

// 1. Spawning
code = code.replace(
/if \(r < 0.15\) \{\s*\/\/ Spawn Gola[\s\S]*?\} else if \(r < 0\.40\) \{\s*\/\/ Spawn Crystal[\s\S]*?\} else \{/m,
`if (r < 0.15) {
          // Spawn Hazard (Virus/Skull)
          enemies.push({
             type: 'hazard',
             x: rand(30, canvas.width - 30),
             y: -50,
             radius: 25 + (currentLevel * 2), // Gets bigger
             hp: 9999, // Super hard to kill via bullets
             vx: rand(-1.5, 1.5),
             vy: rand(2.5, 4.5) + (currentLevel * 0.5), // fast
             color: "#ef4444"
          });
        } else if (r < 0.40) {
          // Spawn Reward (Points Powerup)
          enemies.push({
             type: 'reward',
             x: rand(20, canvas.width - 20),
             y: -50,
             radius: 20,
             hp: 1, // Doesn't matter, bullets pass through or destroy
             points: 150 + (currentLevel * 20),
             vx: Math.sin(frame * 0.05) * 2, // Wobbly
             vy: rand(2, 4),
             color: "#eab308"
          });
        } else {`
);

// 2. Drawing
code = code.replace(
/if \(e\.type === "bomb"\) \{[\s\S]*?\} else if \(e\.type === "crystal"\) \{[\s\S]*?\} else \{/m,
`if (e.type === "hazard") {
           // Draw Virus/Spiky ball
           ctx.beginPath();
           for(let s=0; s<8; s++) {
             const ang = (s * Math.PI * 2) / 8 + frame * 0.02;
             const px1 = e.x + Math.cos(ang) * e.radius;
             const py1 = e.y + Math.sin(ang) * e.radius;
             const px2 = e.x + Math.cos(ang+0.2) * (e.radius * 0.5);
             const py2 = e.y + Math.sin(ang+0.2) * (e.radius * 0.5);
             if(s===0) { ctx.moveTo(px1,py1); ctx.lineTo(px2,py2); }
             else { ctx.lineTo(px1,py1); ctx.lineTo(px2,py2); }
           }
           ctx.closePath();
           ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fill();
           ctx.strokeStyle = "#ef4444"; ctx.stroke();
           ctx.fillStyle = "#ef4444";
           ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.3, 0, Math.PI*2); ctx.fill();
        } else if (e.type === "reward") {
           // Draw Star/Coin with points
           ctx.beginPath();
           ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
           ctx.fillStyle = "rgba(234, 179, 8, 0.2)"; ctx.fill();
           ctx.strokeStyle = "#eab308"; ctx.lineWidth = 2; ctx.stroke();
           ctx.fillStyle = "#fff";
           ctx.font = "bold 12px Inter";
           ctx.textAlign = "center"; ctx.textBaseline = "middle";
           ctx.fillText("+" + e.points, e.x, e.y);
        } else {`
);

// 3. Bullet Collision Logic
code = code.replace(
/if \(e\.type === "bomb"\) \{[\s\S]*?break;\s*\}\s*else\s*\{[\s\S]*?\}\s*if \(e\.hp <= 0\) \{/m,
`if (e.type === "hazard") {
                 e.hp -= b.dmg * 0.1;
                 for(let p=0; p<2; p++) particles.push({x: b.x, y: b.y, vx: rand(-2,2), vy: rand(-2,2), life: 1, c: '#ef4444'});
                 bullets.splice(i, 1);
                 break;
              } else if (e.type === "reward") {
                 // Bullets just pass through or get absorbed
                 bullets.splice(i, 1);
                 break;
              } else {
                 e.hp -= b.dmg;
                 bullets.splice(i, 1);
                 for(let p=0; p<3; p++) particles.push({x: e.x, y: e.y, vx: rand(-3,3), vy: rand(-3,3), life: 1, c: e.color});
              }
              
              if (e.hp <= 0 && e.type !== "reward") {`
);

// 4. remove crystal sound logic from bullet death
code = code.replace(
/if \(e\.type === "crystal"\) \{[\s\S]*?\} else if \(e\.type === "enemy"\) \{/m,
`if (e.type === "enemy") {`
);

// 5. Player Collision Logic
code = code.replace(
/if \(e\.type === "bomb"\) \{\s*\/\/ Game Over Gola[\s\S]*?addText\(\`CRITICAL HIT!\`, player\.x, player\.y, '\#ef4444', 30, 2\);\s*\}\s*else\s*\{/m,
`if (e.type === "hazard") {
             // Game Over
             currentHp = 0;
             playSound("bomb");
             for(let p=0; p<50; p++) particles.push({x: player.x, y: player.y, vx: rand(-10,10), vy: rand(-10,10), life: 2, c: '#ef4444'});
             addText(\`CRITICAL HIT!\`, player.x, player.y, '#ef4444', 30, 2);
           } else if (e.type === "reward") {
             // Picked up points!
             playSound("crystal");
             currentScore += e.points;
             sessionCoins += 5;
             addText(\`+\$\{e.points\} SCORE\`, player.x, player.y - 30, '#eab308', 20, 1.5);
           } else {`
);

// 6. Level Up Logic in Player Collision (because gathering reward might level up!)
code = code.replace(
/setHp\(currentHp\);\s*enemies\.splice\(i, 1\);\s*if \(currentHp <= 0\) \{/m,
`setHp(currentHp);
           enemies.splice(i, 1);
           
           if (currentScore >= currentTarget && !gameOverHandled) {
              setScore(currentScore);
              setHp(currentHp);
              setCoins(prev => prev + sessionCoins);
              playSound("levelup");
              setGameState("LEVEL_COMPLETE");
              gameOverHandled = true;
              isCancelled = true;
              return; // Stop processing rest
           }

           if (currentHp <= 0 && !gameOverHandled) {`
);

// 7. Level Up check from ENEMY death logic (remove the massive block that leveled up mid-frame)
code = code.replace(
/\/\/ Level up check immediately\s*if \(currentScore >= currentTarget\) \{[\s\S]*?\}/m,
`// Trigger level up on loop
                 if (currentScore >= currentTarget && !gameOverHandled) {
                    setScore(currentScore);
                    setHp(currentHp);
                    setCoins(prev => prev + sessionCoins);
                    playSound("levelup");
                    setGameState("LEVEL_COMPLETE");
                    gameOverHandled = true;
                    isCancelled = true;
                    return;
                 }`
);

fs.writeFileSync('src/pages/NeonStrike.tsx', code);
