import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import GroupPage from "./pages/GroupPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import Personal from "./pages/Personal";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* DYNAMIC BACKGROUND UI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#FAFAFF] -z-10">
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-300/40 blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
         <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-300/40 blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-indigo-300/40 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
      </div>

      <div className="min-h-screen text-foreground relative z-0 selection:bg-violet-200">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/group/:id" element={<GroupPage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/personal" element={<Personal />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
