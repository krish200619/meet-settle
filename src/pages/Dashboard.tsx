import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGroups, createGroup, deleteGroup } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { Plus, User } from "lucide-react";
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

  // CREATE GROUP
  const handleCreate = () => {
    if (!newName.trim()) return;
    const g = createGroup(newName.trim());
    setGroups(getGroups());
    setNewName("");
    setOpen(false);
    navigate(`/group/${g.id}`);
  };

  // DELETE GROUP
  const handleDelete = (id: string) => {
    if (!confirm("Delete this group?")) return;
    deleteGroup(id);
    setGroups(getGroups());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Meet<span className="text-primary">Split</span>
          </h1>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/personal")}
              className="bg-white border text-black"
            >
              Personal
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground gap-1">
                  <Plus className="w-4 h-4" />
                  New Split
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Split</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="e.g. Dinner with Friends"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />

                  <Button
                    onClick={handleCreate}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    Create Split
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* BANNER */}
        <div className="bg-secondary rounded-lg px-4 py-3 text-center text-sm text-muted-foreground mb-6">
          Split Bills Fast – No Login Needed!
        </div>

        {/* GROUPS */}
        <div className="space-y-3">
          {groups.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No splits yet. Create one to get started!
            </p>
          )}

          {groups.map((g) => (
            <div
              key={g.id}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
            >
              {/* CLICK AREA */}
              <div
                onClick={() => navigate(`/group/${g.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-card-foreground">
                    {g.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(g.createdAt)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  {g.members.length} members · {g.expenses.length} expenses
                </div>
              </div>

              {/* DELETE BUTTON */}
              <button
                onClick={() => handleDelete(g.id)}
                className="mt-3 text-red-500 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* BOTTOM BUTTON */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <Button
            onClick={() => setOpen(true)}
            className="w-full bg-primary text-primary-foreground h-12 text-base font-semibold rounded-xl shadow-lg"
          >
            + Create New Split
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;