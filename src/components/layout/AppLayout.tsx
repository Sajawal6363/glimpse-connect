import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import ParticleBackground from "./ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <ParticleBackground />
        <div className="gradient-mesh fixed inset-0 z-0 pointer-events-none" />

        <AppSidebar />

        <div className="flex-1 flex flex-col z-10">
          <Navbar />
          <div className="hidden md:flex items-center h-0">
            <SidebarTrigger className="ml-2 mt-4 text-muted-foreground hover:text-foreground" />
          </div>

          <main className="flex-1 pb-20 md:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <MobileNav />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
