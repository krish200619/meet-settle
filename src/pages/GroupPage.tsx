import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getGroup,
  addMember,
  addExpense,
  deleteExpense,
  simplifyDebts,
  getUpiLink,
  type Group,
  type Settlement,
} from "@/lib/store";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { ArrowLeft, Plus, Share2, Trash2, ExternalLink } from "lucide-react";
import BillScanner from "@/components/BillScanner";
import SmartReminders from "@/components/SmartReminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const GroupPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | undefined>();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [tab, setTab] = useState<"expenses" | "settle">("expenses");

  // Add member state
  const [memberName, setMemberName] = useState("");
  const [memberUpi, setMemberUpi] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);

  // Add expense state
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expOpen, setExpOpen] = useState(false);

  const reload = () => {
    const g = getGroup(id!);
    setGroup(g);
    if (g) setSettlements(simplifyDebts(g));
  };

  useEffect(() => {
    reload();
  }, [id]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  const getMemberName = (mid: string) => group.members.find((m) => m.id === mid)?.name || "Unknown";
  const getMember = (mid: string) => group.members.find((m) => m.id === mid);

  const handleAddMember = () => {
    if (!memberName.trim()) return;
    addMember(group.id, memberName.trim(), memberUpi.trim() || undefined);
    setMemberName("");
    setMemberUpi("");
    setMemberOpen(false);
    reload();
  };

  const handleAddExpense = () => {
    if (!expDesc.trim() || !expAmount || !expPaidBy) return;
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    // Split equally among all members
    const splitAmong = group.members.map((m) => m.id);
    addExpense(group.id, expDesc.trim(), amt, expPaidBy, splitAmong);
    setExpDesc("");
    setExpAmount("");
    setExpPaidBy("");
    setExpOpen(false);
    reload();
  };

  const handleBillExpenses = (expenses: { description: string; amount: number; paidBy: string }[]) => {
    const splitAmong = group.members.map((m) => m.id);
    expenses.forEach((exp) => {
      addExpense(group.id, exp.description, exp.amount, exp.paidBy, splitAmong);
    });
    reload();
  };

  const handleDelete = (expenseId: string) => {
    deleteExpense(group.id, expenseId);
    reload();
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it with your friends.");
  };

  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="text-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1">{group.name}</h1>
          <button onClick={handleShare}>
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Members */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {group.members.map((m) => (
            <span
              key={m.id}
              className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full"
            >
              {m.name}
            </span>
          ))}
          <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
            <DialogTrigger asChild>
              <button className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
                <Input
                  placeholder="UPI ID (optional)"
                  value={memberUpi}
                  onChange={(e) => setMemberUpi(e.target.value)}
                />
                <Button onClick={handleAddMember} className="w-full bg-primary text-primary-foreground">
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab("expenses")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "expenses"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTab("settle")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "settle"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Settle Up
          </button>
        </div>

        {tab === "expenses" && (
          <div className="space-y-4">
            {/* Total */}
            <div className="text-center text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">{formatCurrency(totalExpenses)}</span>
            </div>

            {/* Expenses list */}
            {group.expenses.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No expenses yet. Add one below!
              </p>
            )}
            {group.expenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-card-foreground">{exp.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid by {getMemberName(exp.paidBy)} · {timeAgo(exp.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{formatCurrency(exp.amount)}</span>
                  <button onClick={() => handleDelete(exp.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add expense */}
            {group.members.length >= 2 ? (
              <div className="space-y-3">
                <Dialog open={expOpen} onOpenChange={setExpOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-primary text-primary-foreground h-12 rounded-xl">
                      <Plus className="w-4 h-4 mr-2" /> Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Expense</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input
                        placeholder="What was it for?"
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                      />
                      <Input
                        placeholder="Amount (₹)"
                        type="number"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                      />
                      <Select value={expPaidBy} onValueChange={setExpPaidBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Who paid?" />
                        </SelectTrigger>
                        <SelectContent>
                          {group.members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddExpense}
                        className="w-full bg-primary text-primary-foreground"
                      >
                        Add Expense
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <BillScanner members={group.members} onAddExpenses={handleBillExpenses} />
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                Add at least 2 members to start adding expenses
              </p>
            )}
          </div>
        )}

        {tab === "settle" && (
          <div className="space-y-4">
            <SmartReminders settlements={settlements} getMemberName={getMemberName} />
            <p className="text-center text-sm text-muted-foreground font-medium">
              Simplified Payments
            </p>

            {settlements.length === 0 && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-muted-foreground text-sm">All Settled!</p>
              </div>
            )}

            {settlements.map((s, i) => {
              const fromMember = getMember(s.from);
              const toMember = getMember(s.to);
              const upiId = toMember?.upiId;

              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-card-foreground">
                      {fromMember?.name} pays {toMember?.name}
                    </p>
                    <p className="text-lg font-bold text-owe">{formatCurrency(s.amount)}</p>
                  </div>
                  {upiId ? (
                    <a
                      href={getUpiLink(upiId, toMember?.name || "", s.amount)}
                      className="bg-settle text-settle-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"
                    >
                      Pay via UPI <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No UPI ID</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer branding */}
        <p className="text-center text-xs text-muted-foreground mt-12 pb-6">
          Created with <span className="font-semibold text-primary">MeetSplit</span>
        </p>
      </div>
    </div>
  );
};

export default GroupPage;
