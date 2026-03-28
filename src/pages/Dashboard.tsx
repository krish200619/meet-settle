import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGroups, createGroup, deleteGroup } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Plus, User, Trash2, Users, Receipt, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const Dashboard = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(getGroups());
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const g = createGroup(newName.trim());
    setGroups(getGroups());
    setNewName("");
    setOpen(false);
    navigate(`/group/${g.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this group?")) return;
    deleteGroup(id);
    setGroups(getGroups());
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-2xl px-4 md:px-8 py-5 flex items-center justify-between border-b border-white/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meet<span className="text-gradient">Split</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5 hidden sm:block">Welcome back!</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/personal")}
            className="h-10 px-4 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 transition-transform active:scale-95 hover:bg-violet-200 shadow-sm font-semibold gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Personal</span>
          </button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white shadow-sm font-semibold transition-all active:scale-95 group hidden sm:flex">
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                New Split
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-[2rem] p-6 border-0 shadow-2xl bg-white">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-black text-center text-gray-900">New Split</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-1">Event Name</label>
                  <Input
                    placeholder="e.g. Goa Trip, Friday Dinner..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="h-14 rounded-xl bg-gray-50/50 border-gray-200 focus-visible:ring-violet-500 focus-visible:ring-2 shadow-inner px-4 text-base font-medium"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  className="w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg shadow-lg shadow-violet-200 transition-all active:scale-95"
                >
                  Let's Go
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
            <User className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 space-y-10">
        {/* BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-indigo-200/50 flex flex-col md:flex-row items-center justify-between">
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl font-black mb-3">Split Bills Fast</h2>
            <p className="text-violet-100 text-lg leading-relaxed font-medium max-w-lg mx-auto md:mx-0">
              No logins, no friction. Just elegant bill splitting with friends.
            </p>
          </div>
          <div className="relative z-10 mt-6 md:mt-0 sm:hidden w-full max-w-[200px]">
             <Button onClick={() => setOpen(true)} className="w-full h-14 px-8 rounded-2xl bg-white text-violet-700 hover:bg-violet-50 font-bold shadow-lg text-lg">
                <Plus className="w-5 h-5 mr-2" /> New Split
             </Button>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute right-40 -bottom-20 w-48 h-48 bg-indigo-400/30 rounded-full blur-2xl hidden md:block"></div>
        </div>

        {/* GROUPS LIST */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Recent Splits</h3>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground bg-gray-100 px-3 py-1.5 rounded-full">
              {groups.length} Total
            </span>
          </div>

          {groups.length === 0 && (
            <div className="text-center py-20 px-4 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-xl text-gray-900 font-bold mb-2">No splits yet</p>
              <p className="text-gray-500 font-medium max-w-sm mx-auto">Create one to start tracking your group expenses!</p>
              <Button onClick={() => setOpen(true)} className="mt-6 h-12 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold sm:hidden">
                Create New Split
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/group/${g.id}`)}
                className="group relative bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl hover:border-violet-200 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[160px]"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-50 flex items-center justify-center shadow-inner border border-violet-100/50">
                    <span className="text-2xl font-extrabold text-violet-600">
                      {g.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, g.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 text-[1.25rem] mb-2.5 pr-4 line-clamp-1 break-all">{g.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 font-semibold mb-5">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                      <Users className="w-4 h-4 text-gray-400" /> {g.members.length}
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                      <Receipt className="w-4 h-4 text-gray-400" /> {g.expenses.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{timeAgo(g.createdAt)}</span>
                  <div className="flex items-center text-violet-600 font-bold text-sm">
                    View <ChevronRight className="w-4 h-4 ml-1 sm:group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;