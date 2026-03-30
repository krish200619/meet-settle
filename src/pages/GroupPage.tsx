import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getGroup,
  addExpense,
  simplifyDebts,
  deleteExpense,
  getUpiLink,
  updateGroup,
  addMember,
  type Group,
} from "@/lib/store";
import { formatCurrency, nanoid } from "@/lib/utils";
import { ArrowLeft, Share2, Trash2, Receipt, ArrowRight, Wallet, CheckCircle2, Plus, Camera, Loader2, X, PieChart, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import Tesseract from 'tesseract.js';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { QRCodeCanvas } from "qrcode.react";

const getEmoji = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes("food") || d.includes("dinner") || d.includes("lunch")) return "🍽️";
  if (d.includes("pizza")) return "🍕";
  if (d.includes("burger")) return "🍔";
  if (d.includes("coffee") || d.includes("cafe") || d.includes("chai")) return "☕";
  if (d.includes("beer") || d.includes("drinks") || d.includes("party")) return "🥂";
  if (d.includes("movie") || d.includes("cinema") || d.includes("ticket")) return "🍿";
  if (d.includes("cab") || d.includes("uber") || d.includes("taxi")) return "🚕";
  if (d.includes("flight") || d.includes("plane") || d.includes("ticket")) return "✈️";
  if (d.includes("hotel") || d.includes("stay") || d.includes("room")) return "🏨";
  if (d.includes("groceries") || d.includes("supermarket")) return "🛒";
  if (d.includes("gift") || d.includes("present") || d.includes("birthday")) return "🎁";
  if (d.includes("gas") || d.includes("petrol") || d.includes("fuel")) return "⛽";
  if (d.includes("trip") || d.includes("vacation") || d.includes("tour")) return "🌴";
  return "💸";
};

const GroupPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | undefined>();
  const [activeTab, setActiveTab] = useState<'expenses' | 'settle' | 'members' | 'stats'>('expenses');

  const getCategory = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("food") || d.includes("dinner") || d.includes("lunch") || d.includes("pizza") || d.includes("burger") || d.includes("sada")) return "Food & Dining";
    if (d.includes("coffee") || d.includes("cafe") || d.includes("chai") || d.includes("beer") || d.includes("drinks") || d.includes("party") || d.includes("soda")) return "Entertainment";
    if (d.includes("movie") || d.includes("cinema") || d.includes("ticket") || d.includes("trip") || d.includes("vacation") || d.includes("tour")) return "Entertainment";
    if (d.includes("cab") || d.includes("uber") || d.includes("taxi") || d.includes("flight") || d.includes("plane") || d.includes("gas") || d.includes("petrol") || d.includes("fuel")) return "Transport";
    if (d.includes("hotel") || d.includes("stay") || d.includes("room")) return "Accommodation";
    if (d.includes("groceries") || d.includes("supermarket")) return "Groceries";
    if (d.includes("gift") || d.includes("present") || d.includes("birthday")) return "Gifts";
    return "Other";
  };

  const categoryColors: Record<string, string> = {
    "Food & Dining": "#f97316",
    "Entertainment": "#8b5cf6",
    "Transport": "#06b6d4",
    "Accommodation": "#ec4899",
    "Groceries": "#10b981",
    "Gifts": "#f43f5e",
    "Other": "#64748b"
  };

  // NEW STATES
  const [desc, setDesc] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberUpi, setEditMemberUpi] = useState("");

  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // SCANNIG STATE
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedItems, setScannedItems] = useState<{id: string, name: string, amount: number}[]>([]);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [scannedPayerId, setScannedPayerId] = useState<string>("");
  const [paymentQR, setPaymentQR] = useState<{link: string, amount: number, toName: string, upiId: string} | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    toast.info("Scanning receipt... This may take a moment.", { duration: 5000 });

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(m.progress);
          }
        }
      });
      
      const lines = result.data.text.split('\n');
      const foundItems: {name: string, amount: number}[] = [];
      const badWords = ['total', 'tax', 'gst', 'cgst', 'sgst', 'amount', 'balance', 'cash', 'change', 'subtotal', 'round off', 'discount', 'swiggy', 'zomato', 'paid'];
      
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 5) return;

        // Improved Regex: captures more lenient line structures that end with a price
        // Matches anything up to a potential currency symbol or dash, then captures numbers (e.g. "145", "14.50", "12,00")
        const match = cleanLine.match(/^(.*?)(?:RS|Rs\.?|₹|\$)?\s*[\:\-\=]?\s*(\d+[\.\,]\d{1,2}|\d{1,})\s*$/i);
        
        if (match) {
           const rawName = match[1].replace(/^[^a-zA-Z]+/, '').trim();
           // Normalize commas to periods for JS float parsing
           const amt = parseFloat(match[2].replace(',', '.'));
           
           if (rawName.length > 2 && amt > 0 && !badWords.some(w => rawName.toLowerCase().includes(w))) {
             foundItems.push({ name: rawName, amount: amt });
           }
        }
      });

      if (foundItems.length > 0) {
        setScannedItems(foundItems.map(item => ({ ...item, id: nanoid() })));
        setScannedPayerId(group.members.length > 0 ? group.members[0].id : "");
        setIsVerifyDialogOpen(true);
      } else {
        // If it failed to find strictly matching price rows, fallback to raw text verification?
        toast.error("Couldn't identify items. Tesseract output might be too messy. Try taking a very clear, completely straight photo.", { duration: 6000 });
      }
    } catch (err) {
      toast.error("Failed to scan receipt image.");
      console.error(err);
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  const reload = () => {
    const g = getGroup(id!);
    setGroup(g);
  };

  useEffect(() => {
    reload();
  }, [id]);

  useEffect(() => {
    if (group) {
      setSelectedMembers(group.members.map((m) => m.id));
      if (group.members.length > 0) {
        setPaidBy(group.members[0].id);
      }
    }
  }, [group]);

  const toggleParticipant = (expenseId: string, memberId: string) => {
    if (!group) return;
    const newGroup = { ...group };
    const exp = newGroup.expenses.find(e => e.id === expenseId);
    if (!exp) return;
    
    if (exp.splitAmong.includes(memberId)) {
      if (exp.splitAmong.length <= 1) {
        toast.error("Someone has to pay! At least 1 person is required.");
        return;
      }
      exp.splitAmong = exp.splitAmong.filter(id => id !== memberId);
    } else {
      exp.splitAmong.push(memberId);
    }
    
    updateGroup(newGroup);
    reload();
  };

  const memberBadges = useMemo(() => {
    if (!group || group.expenses.length === 0) return {};
    const badges: Record<string, {text: string, color: string, bg: string}> = {};

    let maxPaid = 0;
    let maxPaidUserId = "";
    
    let maxOwed = 0;
    let maxOwedUserId = "";

    const userCategoryCounts: Record<string, Record<string, number>> = {};
    const paidSums = new Map<string, number>();
    const shareSums = new Map<string, number>();

    group.expenses.forEach(exp => {
      paidSums.set(exp.paidBy, (paidSums.get(exp.paidBy) || 0) + exp.amount);
      const share = exp.amount / exp.splitAmong.length;
      exp.splitAmong.forEach(m => {
        shareSums.set(m, (shareSums.get(m) || 0) + share);
        
        const cat = getCategory(exp.description);
        if (!userCategoryCounts[m]) userCategoryCounts[m] = {};
        userCategoryCounts[m][cat] = (userCategoryCounts[m][cat] || 0) + 1;
      });
    });

    paidSums.forEach((val, id) => {
      if (val > maxPaid) { maxPaid = val; maxPaidUserId = id; }
    });

    shareSums.forEach((val, id) => {
      if (val > maxOwed) { maxOwed = val; maxOwedUserId = id; }
    });

    group.members.forEach(m => {
      if (m.id === maxPaidUserId && maxPaid > 0) {
        badges[m.id] = { text: "The Bank 🏦", color: "text-amber-700", bg: "bg-amber-100" };
        return;
      }
      
      const myShare = shareSums.get(m.id) || 0;
      const myPaid = paidSums.get(m.id) || 0;
      
      if (myShare > 0 && myPaid === 0 && m.id === maxOwedUserId) {
        badges[m.id] = { text: "Freeloader 😂", color: "text-rose-700", bg: "bg-rose-100" };
        return;
      }

      if (m.id === maxOwedUserId && maxOwed > 0) {
         badges[m.id] = { text: "Big Spender 💸", color: "text-emerald-700", bg: "bg-emerald-100" };
         return;
      }

      const cats = userCategoryCounts[m.id];
      if (cats) {
        let topCat = "";
        let maxC = 0;
        Object.entries(cats).forEach(([c, val]) => {
           if (val > maxC) { maxC = val; topCat = c; }
        });
        if (topCat === "Food & Dining") badges[m.id] = { text: "The Foodie 🍔", color: "text-orange-700", bg: "bg-orange-100" };
        else if (topCat === "Entertainment") badges[m.id] = { text: "Party Animal 🥂", color: "text-fuchsia-700", bg: "bg-fuchsia-100" };
        else if (topCat === "Transport") badges[m.id] = { text: "Globetrotter ✈️", color: "text-sky-700", bg: "bg-sky-100" };
        else badges[m.id] = { text: "The Regular 👻", color: "text-gray-600", bg: "bg-gray-100" };
      } else {
        badges[m.id] = { text: "Newcomer 🐣", color: "text-teal-700", bg: "bg-teal-100" };
      }
    });

    return badges;
  }, [group]);

  if (!group) return <div className="p-8 text-center text-gray-500 font-medium">Group not found</div>;

  const settlements = simplifyDebts(group);

  const getMemberName = (mid: string) =>
    group.members.find((m) => m.id === mid)?.name || "Unknown";

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const handleAddExpense = () => {
    if (!desc || !amount || !paidBy) return;

    if (selectedMembers.length === 0) {
      toast.error("Select at least 1 person");
      return;
    }

    addExpense(
      group.id,
      desc,
      parseFloat(amount),
      paidBy,
      selectedMembers
    );

    setDesc("");
    setAmount("");
    setIsAdding(false);
    toast.success("Expense added");
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#a78bfa', '#fcd34d']
    });

    reload();
  };

  const total = group.expenses.reduce((a, b) => a + b.amount, 0);
  
  const statsData = group ? Array.from(
    group.expenses.reduce((acc, exp) => {
      const cat = getCategory(exp.description);
      acc.set(cat, (acc.get(cat) || 0) + exp.amount);
      return acc;
    }, new Map<string, number>()).entries()
  ).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value) : [];


  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-2xl px-4 md:px-8 py-5 flex items-center justify-between border-b border-white/40">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>

        <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[50%]">{group.name}</h2>

        <button 
          onClick={handleShare}
          className="h-10 px-4 flex items-center justify-center rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors font-semibold gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Invite</span>
        </button>
      </div>

      {/* EXPIRY NUDGE */}
      <div className="bg-amber-50/50 border-y border-amber-100 py-2 px-4 flex items-center justify-center gap-2">
        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-700 animate-pulse">⏳ This split expires in 24 hours</span>
        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-500/60">•</span>
        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-700">Save permanently (Pro)</span>
      </div>


      <div className="px-4 md:px-8 py-8 lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
        
        {/* LEFT COLUMN: Summary & Navigation */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
          {/* TOTAL CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-gray-900/20 text-center">
            <p className="text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wider">Total Group Spend</p>
            <p className="text-4xl md:text-5xl font-black tracking-tight mb-6">₹{total.toLocaleString('en-IN')}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 relative z-10">
              {group.members.map((m) => (
                <span key={m.id} className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/5">
                  {m.name}
                </span>
              ))}
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/20 rounded-full blur-xl -ml-10 -mb-10"></div>
          </div>

          {/* TABS SIDEBAR (Desktop) / TOP (Mobile) */}
          <div className="grid grid-cols-4 lg:flex lg:flex-col bg-[#f8f9fc] rounded-[2rem] p-1.5 shadow-inner border border-gray-100/50 lg:h-fit lg:sticky lg:top-32 h-fit">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-full py-3 lg:py-4 lg:px-6 gap-1 md:gap-2 rounded-[1.5rem] transition-all relative overflow-hidden ${
                activeTab === "expenses" ? "text-violet-700 bg-white shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Receipt className="w-5 h-5 md:w-6 md:h-6" />
              <span className="font-bold text-[0.7rem] md:text-sm tracking-wide">Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('settle')}
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-full py-3 lg:py-4 lg:px-6 gap-1 md:gap-2 rounded-[1.5rem] transition-all relative overflow-hidden ${
                activeTab === "settle" ? "text-violet-700 bg-white shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Wallet className="w-5 h-5 md:w-6 md:h-6" />
              <span className="font-bold text-[0.7rem] md:text-sm tracking-wide">Settle Up</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-full py-3 lg:py-4 lg:px-6 gap-1 md:gap-2 rounded-[1.5rem] transition-all relative overflow-hidden ${
                activeTab === "members" ? "text-violet-700 bg-white shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Users className="w-5 h-5 md:w-6 md:h-6" />
              <span className="font-bold text-[0.7rem] md:text-sm tracking-wide">Members</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-full py-3 lg:py-4 lg:px-6 gap-1 md:gap-2 rounded-[1.5rem] transition-all relative overflow-hidden ${
                activeTab === "stats" ? "text-violet-700 bg-white shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <PieChart className="w-5 h-5 md:w-6 md:h-6" />
              <span className="font-bold text-[0.7rem] md:text-sm tracking-wide">Stats</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Tab Content */}
        <div className="lg:col-span-8 space-y-6 mt-8 lg:mt-0">
          {/* TAB CONTENT: EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-6 pb-10">
              {/* ADD EXPENSE BUTTON / FORM */}
              {!isAdding ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold py-5 rounded-[1.5rem] border-2 border-dashed border-violet-200 transition-all active:scale-[0.98] text-lg"
                  >
                    <Plus className="w-6 h-6" /> Add Manually
                  </button>

                  <div className={`relative flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-5 rounded-[1.5rem] border-2 border-dashed border-indigo-200 transition-all ${isScanning ? 'opacity-80' : 'active:scale-[0.98]'} text-lg`}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleFileUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isScanning}
                    />
                    {isScanning ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Scanning {Math.round(scanProgress * 100)}%</>
                    ) : (
                      <><Camera className="w-6 h-6" /> Scan Bill</>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900 text-xl">New Expense</h3>
                    <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100">Cancel</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Input
                        className="h-14 bg-gray-50 border-gray-200 rounded-xl px-4 font-semibold text-base"
                        placeholder="What was this for?"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₹</span>
                        <Input
                          className="h-14 bg-gray-50 border-gray-200 rounded-xl pl-9 font-black text-xl text-gray-900"
                          placeholder="0.00"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">Paid By</label>
                        <select
                          className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-4 font-bold text-gray-900 appearance-none focus:ring-2 focus:ring-violet-500 outline-none"
                          value={paidBy}
                          onChange={(e) => setPaidBy(e.target.value)}
                        >
                          {group.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Split With:</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedMembers(group.members.map(m => m.id))}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-1 rounded-md"
                          >All</button>
                          <button 
                            onClick={() => setSelectedMembers([])}
                            className="text-[10px] font-bold text-gray-500 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded-md"
                          >None</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">

                        {group.members.map((m) => {
                          const isSelected = selectedMembers.includes(m.id);
                          return (
                            <label 
                              key={m.id} 
                              className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected ? "border-violet-500 bg-violet-50 shadow-sm" : "border-gray-100 bg-white hover:border-violet-200"
                              }`}
                            >
                              <span className={`text-sm font-bold truncate ${isSelected ? "text-violet-700" : "text-gray-600"}`}>
                                {m.name}
                              </span>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ml-2 ${
                                isSelected ? "bg-violet-500 border-violet-500" : "border-gray-300"
                              }`}>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="scale-0 opacity-0 absolute">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedMembers([...selectedMembers, m.id]);
                                    else setSelectedMembers(selectedMembers.filter(id => id !== m.id));
                                  }}
                                />
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddExpense}
                    className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-xl mt-6 shadow-lg shadow-violet-200"
                  >
                    Save Expense
                  </Button>
                </div>
              )}

              {/* EXPENSE LIST */}
              {group.expenses.length === 0 && !isAdding && (
                <div className="text-center py-20 px-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
                      <Receipt className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-2xl text-gray-900 font-bold mb-2">No expenses yet 😴</p>
                    <p className="text-gray-500 font-medium text-lg">Add one and stop losing money 💸</p>
                  </div>
                </div>
              )}

              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {group.expenses.map((exp) => {
                  const isExpanded = expandedId === exp.id;
                  const splitAmount = exp.amount / exp.splitAmong.length;
                  const payerName = getMemberName(exp.paidBy);
                  
                  return (
                  <div 
                    key={exp.id} 
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className={`bg-white p-5 rounded-[1.5rem] shadow-sm border transition-all duration-300 cursor-pointer flex flex-col ${isExpanded ? 'border-violet-200 shadow-md ring-4 ring-violet-50' : 'border-gray-100 hover:border-violet-100 hover:shadow-md'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center shrink-0 border border-violet-100 shadow-inner">
                          <span className="text-2xl">{getEmoji(exp.description)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-[1.1rem] leading-tight line-clamp-2 break-word pr-2" title={exp.description}>{exp.description}</p>
                          <p className="text-sm text-gray-500 font-medium mt-1.5">
                            Paid by <span className="font-bold text-gray-800">{payerName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                        <p className="font-black text-gray-900 tracking-tight text-[1.15rem] shadow-sm bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">₹{exp.amount.toLocaleString('en-IN')}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteExpense(group.id, exp.id);
                            reload();
                          }}
                          className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2.5 rounded-full transition-colors flex items-center justify-center border border-gray-100"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm border border-violet-200 z-10 shrink-0">
                            {payerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-800 text-[0.95rem]">
                            {payerName} <span className="text-gray-500 font-medium">paid</span> ₹{exp.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        
                        <div className="ml-4 pl-6 border-l-2 border-gray-100/80 space-y-1 py-2 relative">
                          {group.members.map((member) => {
                            const memName = member.name;
                            const memberId = member.id;
                            const isSelected = exp.splitAmong.includes(memberId);
                            
                            return (
                              <div 
                                key={memberId} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleParticipant(exp.id, memberId);
                                }}
                                className={`flex items-center gap-3 relative group/member cursor-pointer rounded-xl p-2 -ml-2 transition-all duration-300 ${
                                  isSelected ? 'opacity-100 hover:bg-red-50/50' : 'opacity-50 hover:opacity-100 hover:bg-violet-50/50 grayscale hover:grayscale-0'
                                }`}
                                title={isSelected ? `Click to remove ${memName}` : `Click to include ${memName}`}
                              >
                                <div className={`absolute -left-[1.5rem] top-1/2 w-4 h-[2px] transition-colors ${
                                  isSelected ? 'bg-gray-200 group-hover/member:bg-red-200' : 'bg-transparent group-hover/member:bg-violet-200'
                                }`}></div>
                                
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-colors ${
                                  isSelected 
                                    ? 'bg-gray-50 text-gray-600 border-gray-200 group-hover/member:border-red-200 group-hover/member:text-red-500 group-hover/member:bg-red-100' 
                                    : 'bg-gray-50 border-gray-100 text-gray-400 group-hover/member:border-violet-200 group-hover/member:text-violet-600 group-hover/member:bg-violet-100'
                                }`}>
                                   {isSelected ? memName.charAt(0).toUpperCase() : '+'}
                                </div>
                                <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
                                   <strong className={`font-bold ${
                                     isSelected ? 'text-gray-900 group-hover/member:text-red-600' : 'text-gray-400 group-hover/member:text-violet-600'
                                   }`}>{memName}</strong> 
                                   {isSelected 
                                     ? ` owes ₹${splitAmount.toLocaleString('en-IN', {maximumFractionDigits: 2})}` 
                                     : <span className="text-xs ml-1">(not splitting)</span>
                                   }
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* TAB CONTENT: SETTLE UP */}
          {activeTab === "settle" && (
            <div className="space-y-6 pb-10">
              {settlements.length === 0 ? (
                <div className="text-center py-20 px-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-2xl text-gray-900 font-bold mb-2">All Settled Up! 🥳</p>
                  <p className="text-gray-500 font-medium text-lg">Nobody owes anyone anything. Life is good! 🍕</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* VIRAL SHARE BUTTON */}
                  <div className="bg-violet-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-violet-200 relative overflow-hidden group">
                     <div className="relative z-10">
                        <h3 className="text-xl font-black mb-1">Send Reminders! 📣</h3>
                        <p className="text-violet-100 text-sm font-medium mb-4">Don't let them forget. Share the list on WhatsApp.</p>
                        <Button 
                          onClick={() => {
                              const unpaid = settlements.map(s => {
                                const from = getMemberName(s.from);
                                const to = getMemberName(s.to);
                                const emojis = ["😅", "💀", "💸", "🤐", "👀", "🤨"];
                                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                                return `👉 ${from} owes ${to} ₹${s.amount.toLocaleString('en-IN')} ${emoji}`;
                              }).join("\n");
                              const totalText = `*${group.name} Split Summary* ⚡\n\n${unpaid}\n\nSettle fast: ${window.location.href}\n\n_Pay up 😂_`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(totalText)}`, '_blank');
                            }}

                          className="bg-white text-violet-700 hover:bg-violet-50 font-black px-6 py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          Share on WhatsApp
                        </Button>
                     </div>
                     <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Share2 className="w-32 h-32 text-white" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {settlements.map((s, i) => {
                    const fromName = getMemberName(s.from);
                    const toName = getMemberName(s.to);
                    const toMember = group.members.find((m) => m.id === s.to);

                    return (
                      <div key={i} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                          
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 text-rose-600 font-black text-base relative">
                              {fromName.charAt(0).toUpperCase()}
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center">
                                <ArrowRight className="w-3 h-3 text-white" />
                              </span>
                            </div>
                            <div className="w-8 h-[2px] bg-gray-100"></div>
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600 font-black text-base relative">
                              {toName.charAt(0).toUpperCase()}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[11px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Amount Due</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                              ₹{s.amount.toLocaleString('en-IN')}
                            </p>
                          </div>

                        </div>
                        
                        <div className="flex items-center justify-between text-sm font-bold bg-gray-50/80 px-4 py-3 rounded-xl mb-5 border border-gray-100 group/row">
                          <span className="text-rose-600 truncate max-w-[40%]">{fromName}</span>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[10px] uppercase tracking-tighter">
                              {s.amount > 1000 ? "Still pending" : "owes you"}
                            </span>
                            <span className="text-gray-500 text-[11px] font-black">
                              {s.amount > 5000 ? "💀" : s.amount > 500 ? "😅" : "😂"}
                            </span>
                          </div>
                          <span className="text-emerald-600 truncate max-w-[40%] text-right">{toName}</span>
                        </div>



                        {toMember?.upiId ? (
                          <button
                            onClick={() => {
                              confetti({
                                particleCount: 200,
                                spread: 90,
                                origin: { y: 0.6 },
                                zIndex: 9999,
                                colors: ['#10b981', '#34d399', '#fcd34d']
                              });
                              const link = getUpiLink(
                                toMember.upiId!,
                                toName,
                                s.amount
                              );
                              
                              // Check if we are presumably on a mobile device where a direct link might work
                              // Otherwise, show QR code fallback. 
                              // Since we are showing a cool feature, we'll just show the QR immediately and let them know they can scan it or click it on mobile.
                              setPaymentQR({
                                link,
                                amount: s.amount,
                                toName,
                                upiId: toMember.upiId!
                              });
                            }}
                            className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 text-lg"
                          >
                            <Wallet className="w-6 h-6 shrink-0" />
                            Pay via UPI
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2">
                             <button
                               onClick={() => {
                                 const emojis = ["😭", "💀", "😅", "🤨"];
                                 const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                                 const reminder = `Bro ₹${s.amount.toLocaleString('en-IN')} de de ${emoji}\n\nLink: ${window.location.href}`;
                                 window.open(`https://wa.me/?text=${encodeURIComponent(reminder)}`, '_blank');
                               }}
                               className="w-full flex items-center justify-center gap-2 bg-violet-50 text-violet-700 font-bold py-4 rounded-xl border border-violet-100 hover:bg-violet-100 transition-all"
                             >
                               <Share2 className="w-4 h-4" /> Remind {fromName}
                             </button>
                             <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 py-2 rounded-lg border border-dashed border-gray-200">
                               {toName} has no UPI ID
                             </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 space-y-6">
              
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                      <Users className="w-6 h-6 text-indigo-600" />
                   </div>
                   <h2 className="text-xl font-bold text-gray-900 tracking-tight">Group Members</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.members.map((m) => {
                    const isEditing = editingMemberId === m.id;
                    
                    if (isEditing) {
                      return (
                        <div key={m.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-indigo-300 shadow-sm ring-4 ring-indigo-50">
                          <Input 
                            value={editMemberName}
                            onChange={(e) => setEditMemberName(e.target.value)}
                            className="h-10 text-base font-bold bg-gray-50 border-gray-200"
                            placeholder="Member Name"
                          />
                          <Input 
                            value={editMemberUpi}
                            onChange={(e) => setEditMemberUpi(e.target.value)}
                            className="h-10 text-sm bg-gray-50 border-gray-200"
                            placeholder="UPI ID (optional)"
                          />
                          <div className="flex gap-2 mt-1">
                            <button 
                              onClick={() => {
                                const newGroup = { ...group };
                                const mem = newGroup.members.find(x => x.id === m.id);
                                if (mem && editMemberName.trim()) {
                                  mem.name = editMemberName.trim();
                                  mem.upiId = editMemberUpi.trim();
                                  updateGroup(newGroup);
                                  toast.success("Member updated successfully!");
                                  reload();
                                }
                                setEditingMemberId(null);
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
                            >Save</button>
                            <button 
                              onClick={() => setEditingMemberId(null)}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
                            >Cancel</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                    <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-all hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden">
                      <div className="w-12 h-12 rounded-2xl bg-white text-indigo-700 font-black text-lg flex items-center justify-center shrink-0 border border-gray-200 shadow-sm">
                         {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col pr-8">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{m.name}</span>
                          {memberBadges[m.id] && (
                            <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-white/40 shadow-sm ${memberBadges[m.id].bg} ${memberBadges[m.id].color}`}>
                              {memberBadges[m.id].text}
                            </span>
                          )}
                        </div>
                        <span className="text-[0.8rem] font-medium text-gray-500 mt-1 line-clamp-1">
                           {m.upiId ? `UPI: ${m.upiId}` : "No UPI ID added"}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setEditingMemberId(m.id);
                          setEditMemberName(m.name);
                          setEditMemberUpi(m.upiId || "");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Edit Member"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    </div>
                  )})}
                </div>
              </div>

              {/* Add New Member Form */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                 <h3 className="text-[1.15rem] font-bold text-gray-900 mb-4">Add New Member</h3>
                 <div className="flex flex-col md:flex-row gap-3">
                   <Input 
                     placeholder="Name (e.g. John)" 
                     className="flex-1 bg-gray-50 border-gray-200 focus-visible:ring-indigo-500 text-base py-6 rounded-2xl"
                     id="newMemberName"
                   />
                   <Input 
                     placeholder="UPI ID (optional)" 
                     className="flex-1 bg-gray-50 border-gray-200 focus-visible:ring-indigo-500 text-base py-6 rounded-2xl"
                     id="newMemberUpi"
                   />
                   <button 
                     onClick={() => {
                        const nameEl = document.getElementById('newMemberName') as HTMLInputElement;
                        const upiEl = document.getElementById('newMemberUpi') as HTMLInputElement;
                        if (nameEl.value.trim()) {
                           addMember(group.id, nameEl.value.trim(), upiEl.value.trim());
                           toast.success(`${nameEl.value} added to the group!`);
                           nameEl.value = '';
                           upiEl.value = '';
                           reload();
                        } else {
                           toast.error("Please enter a name for the member.");
                        }
                     }}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-200 active:scale-95 shrink-0 whitespace-nowrap"
                   >
                     Add
                   </button>
                 </div>
              </div>
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
              {group.expenses.length === 0 ? (
                <div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white">
                  <PieChart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400 mb-1">No data yet</h3>
                  <p className="text-gray-500">Add some expenses to see your statistics.</p>
                </div>
              ) : (
                <div className="bg-[#1C1C1E] text-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-[#2C2C2E] overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]"></div>
                  <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <h2 className="text-gray-400 font-bold tracking-widest text-[0.85rem] md:text-sm uppercase mb-8">Transactions Statistics</h2>
                    
                    <div className="w-full h-64 sm:h-80 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={statsData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={105}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                              cornerRadius={12}
                            >
                              {statsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || "#64748b"} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                              contentStyle={{ backgroundColor: '#2C2C2E', border: 'none', borderRadius: '1rem', color: '#fff', fontWeight: 'bold' }}
                              itemStyle={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-gray-400 text-[0.8rem] font-bold uppercase tracking-widest leading-none mb-1">Total Spent</span>
                          <span className="text-4xl md:text-5xl font-black tracking-tighter shadow-sm">
                            ₹{group.expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                    </div>
                    
                    {/* Category List */}
                    <div className="w-full mt-10 md:mt-12 grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4 px-2 sm:px-6">
                        {statsData.map(item => (
                          <div key={item.name} className="flex items-center gap-4 group cursor-default">
                            <div className="w-5 h-5 rounded-full shadow-inner border-[3px] border-[#2C2C2E] group-hover:scale-125 transition-transform" style={{ backgroundColor: categoryColors[item.name] || "#64748b" }}></div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-[0.8rem] font-bold uppercase tracking-wider mb-1 line-clamp-1 break-words">{item.name}</span>
                                <span className="text-white font-black text-xl md:text-2xl leading-none">₹{item.value.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SCAN BILL DIALOG */}
      {isVerifyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2"><Receipt className="text-violet-600 w-6 h-6"/> Review Scanned Bill</h2>
              <button onClick={() => setIsVerifyDialogOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-bold p-2 px-3 rounded-full transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50/30">
              <p className="text-sm text-gray-500 mb-4 bg-yellow-50 text-yellow-800 p-4 rounded-2xl border border-yellow-100 font-medium">
                OCR scanning isn't perfect! Please review the scanned items below and correct any misspelled names or incorrect prices.
              </p>
              
              <div className="space-y-3">
                {scannedItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                    <Input 
                      value={item.name} 
                      onChange={e => {
                          const items = [...scannedItems];
                          items[idx].name = e.target.value;
                          setScannedItems(items);
                      }}
                      className="flex-1 border-0 shadow-none focus-visible:ring-0 px-3 bg-transparent font-medium"
                      placeholder="Item Name"
                    />
                    <div className="flex items-center bg-gray-50 rounded-xl pr-2 border border-gray-100 focus-within:border-violet-200">
                      <span className="pl-3 text-gray-500 font-semibold">₹</span>
                      <Input 
                        type="number"
                        value={item.amount || ''} 
                        onChange={e => {
                            const items = [...scannedItems];
                            items[idx].amount = parseFloat(e.target.value) || 0;
                            setScannedItems(items);
                        }}
                        className="w-20 text-right font-black text-lg border-0 shadow-none focus-visible:ring-0 bg-transparent pl-1"
                        placeholder="0.00"
                      />
                    </div>
                    <button 
                      onClick={() => setScannedItems(scannedItems.filter(i => i.id !== item.id))}
                      className="p-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors ml-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                 onClick={() => setScannedItems([...scannedItems, {id: nanoid(), name: "", amount: 0}])}
                 className="w-full text-violet-600 font-bold text-[0.95rem] flex items-center justify-center gap-2 mt-4 hover:bg-violet-50 p-4 rounded-2xl border-2 border-dashed border-violet-200 transition-colors"
              >
                <Plus className="w-5 h-5" /> Add Missing Item
              </button>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 pb-6 md:pb-8">
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">Who paid the bill?</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {group.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setScannedPayerId(m.id)}
                      className={`px-4 py-2 rounded-[1rem] text-[0.95rem] font-bold transition-all shrink-0 border ${
                        scannedPayerId === m.id
                          ? "bg-violet-600 text-white border-violet-600 shadow-md ring-4 ring-violet-50"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  const defaultMembers = group.members.map(m => m.id);
                  let addedCount = 0;

                  scannedItems.forEach(item => {
                    if(item.name.trim() && item.amount > 0) {
                      addExpense(group.id, item.name, item.amount, scannedPayerId, defaultMembers);
                      addedCount++;
                    }
                  });

                  if (addedCount > 0) {
                    confetti({
                      particleCount: 150,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#8b5cf6', '#a78bfa', '#fcd34d'],
                      zIndex: 9999
                    });
                    toast.success(`Successfully added ${addedCount} scanned items!`);
                  }
                  
                  setIsVerifyDialogOpen(false);
                  reload();
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-4 rounded-[1.25rem] shadow-lg transition-all active:scale-[0.98] text-lg"
              >
                <CheckCircle2 className="w-6 h-6" /> Confirm & Add to Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR CODE DIALOG */}
      <Dialog open={!!paymentQR} onOpenChange={(open) => !open && setPaymentQR(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl">
           <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 text-center text-white relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10"></div>
             
             <Wallet className="w-12 h-12 text-white/90 mx-auto mb-4 relative z-10" />
             <h2 className="text-2xl font-black mb-1 relative z-10">Pay {paymentQR?.toName}</h2>
             <p className="text-emerald-100 font-medium relative z-10">{paymentQR?.upiId}</p>
             <p className="text-[2.5rem] font-black mt-2 tracking-tighter relative z-10">₹{paymentQR?.amount.toLocaleString('en-IN')}</p>
           </div>
           
           <div className="p-8 bg-white flex flex-col items-center">
             <div className="bg-white p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 -mt-16 relative z-20 mb-6">
                {paymentQR && (
                  <QRCodeCanvas 
                    value={paymentQR.link} 
                    size={220}
                    bgColor={"#ffffff"}
                    fgColor={"#0f172a"}
                    level={"H"}
                    includeMargin={false}
                  />
                )}
             </div>
             
             <p className="text-gray-500 font-medium text-center text-sm mb-6 max-w-[250px]">
               Scan this QR code with any UPI app (GPay, PhonePe, Paytm) to pay.
             </p>
             
             <div className="w-full space-y-3">
               <a 
                 href={paymentQR?.link}
                 className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold py-3.5 rounded-xl transition-colors border border-emerald-100 md:hidden"
               >
                 Open UPI App directly
               </a>
               <button 
                 onClick={() => setPaymentQR(null)}
                 className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold py-3.5 rounded-xl transition-colors"
               >
                 Close
               </button>
             </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupPage;