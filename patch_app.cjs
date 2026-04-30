const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/import CyberReflex from "\.\/pages\/CyberAim";/, 'import CyberReflex from "./pages/CyberAim";\nimport FindDiff from "./pages/FindDiff";');
content = content.replace(/<Route\s*path="\/gaming\/cyber-reflex"[\s\S]*?<\/Route>/, '<Route path="/gaming/cyber-reflex" element={<ProtectedRoute><CyberReflex /></ProtectedRoute>} />\n        <Route path="/gaming/find-diff" element={<ProtectedRoute><FindDiff /></ProtectedRoute>} />');
fs.writeFileSync('src/App.tsx', content);
