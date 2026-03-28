import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, CheckCircle2, Trash2, Plus, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type Entry = {
    id: number;
    name: string;
    amount: number;
    type: "borrowed" | "lent";
};

export default function Personal() {
    const navigate = useNavigate();

    const [entries, setEntries] = useState<Entry[]>([]);
    const [history, setHistory] = useState<Entry[]>([]);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"borrowed" | "lent">("borrowed");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("personalData");
        if (saved) {
            const parsed = JSON.parse(saved);
            setEntries(parsed.entries || []);
            setHistory(parsed.history || []);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(
            "personalData",
            JSON.stringify({ entries, history })
        );
    }, [entries, history]);

    const getUpiLink = (name: string, amount: number) => {
        return `upi://pay?pa=krish@oksbi&pn=${name}&am=${amount}&cu=INR`;
    };

    const addEntry = () => {
        if (!name || !amount) return;

        const newEntry: Entry = {
            id: Date.now(),
            name,
            amount: parseFloat(amount),
            type,
        };

        setEntries([newEntry, ...entries]);
        setName("");
        setAmount("");
        setIsAdding(false);
    };

    const settle = (id: number) => {
        const item = entries.find(e => e.id === id);
        if (!item) return;

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          zIndex: 9999,
          colors: ['#10b981', '#34d399', '#fcd34d']
        });

        setEntries(entries.filter(e => e.id !== id));
        setHistory([item, ...history]);
    };

    const deleteHistoryEntry = (id: number) => {
        setHistory(history.filter(e => e.id !== id));
    };

    const remove = (id: number) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const youOwe = entries.filter(e => e.type === "borrowed");
    const youGet = entries.filter(e => e.type === "lent");

    const totalOwe = youOwe.reduce((a, b) => a + b.amount, 0);
    const totalGet = youGet.reduce((a, b) => a + b.amount, 0);

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

                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Personal Ledger</h2>

                <div className="w-10 h-10"></div>
            </div>

            <div className="px-4 md:px-8 py-8 space-y-10">
              {/* SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-200/50 relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                          <ArrowUpRight className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-rose-100 font-bold text-sm mb-2 uppercase tracking-wider">You Owe Total</p>
                        <p className="font-black text-4xl tracking-tight">₹{totalOwe.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute top-10 right-10 w-20 h-20 bg-red-400/30 rounded-full blur-xl"></div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                          <ArrowDownLeft className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-emerald-100 font-bold text-sm mb-2 uppercase tracking-wider">You Are Owed Toal</p>
                        <p className="font-black text-4xl tracking-tight">₹{totalGet.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute top-10 right-10 w-20 h-20 bg-green-400/30 rounded-full blur-xl"></div>
                  </div>
              </div>

              {/* ADD */}
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold py-6 rounded-[2rem] border-2 border-dashed border-violet-200 transition-all active:scale-[0.98] text-lg max-w-2xl mx-auto"
                >
                  <Plus className="w-6 h-6" /> Add New Personal Entry
                </button>
              ) : (
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-gray-200/50 border border-gray-100 animate-in fade-in slide-in-from-top-2 max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-50">
                      <h3 className="font-bold text-gray-900 text-xl">New Personal Entry</h3>
                      <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold bg-gray-50 px-3 py-1.5 rounded-lg">Cancel</button>
                    </div>

                    <div className="space-y-5">
                      <Input
                          className="h-14 bg-gray-50 border-gray-200 rounded-xl px-4 font-semibold text-base"
                          placeholder="Person's Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
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

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <label 
                          className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                            type === 'borrowed' ? 'border-rose-500 bg-rose-50 shadow-sm' : 'border-gray-100 bg-white hover:border-rose-200'
                          }`}
                          onClick={() => setType('borrowed')}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'borrowed' ? 'bg-rose-500' : 'bg-gray-100'}`}>
                            <ArrowUpRight className={`w-5 h-5 ${type === 'borrowed' ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <span className={`font-bold text-base ${type === 'borrowed' ? 'text-rose-700' : 'text-gray-500'}`}>I Owe Them</span>
                        </label>

                        <label 
                          className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                            type === 'lent' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-gray-100 bg-white hover:border-emerald-200'
                          }`}
                          onClick={() => setType('lent')}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'lent' ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                            <ArrowDownLeft className={`w-5 h-5 ${type === 'lent' ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <span className={`font-bold text-base ${type === 'lent' ? 'text-emerald-700' : 'text-gray-500'}`}>They Owe Me</span>
                        </label>
                      </div>

                      <Button
                          onClick={addEntry}
                          className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-xl mt-2 shadow-xl shadow-gray-900/20"
                      >
                          Save Entry
                      </Button>
                    </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* YOU OWE */}
                <div className="space-y-4">
                  <h3 className="text-gray-900 font-black text-xl px-1 flex items-center gap-2 mb-4">
                    <ArrowUpRight className="w-6 h-6 text-rose-500" /> You Owe
                  </h3>
                  
                  {youOwe.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-gray-500 font-medium">No one left to pay.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {youOwe.map((e) => (
                          <div key={e.id} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-rose-100 group hover:shadow-md transition-all flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 font-black flex items-center justify-center text-lg border border-rose-100">
                                      {e.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-gray-900 text-xl truncate max-w-[120px]">{e.name}</span>
                                  </div>
                                  <span className="font-black text-rose-600 text-2xl">₹{e.amount.toLocaleString('en-IN')}</span>
                              </div>

                              <div className="flex gap-3">
                                  <button
                                      onClick={() => {
                                          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                                          setTimeout(() => {
                                            window.location.href = getUpiLink(e.name, e.amount);
                                          }, 800);
                                      }}
                                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                                  >
                                      <Wallet className="w-4 h-4" /> Pay
                                  </button>
                                  <button
                                      onClick={() => settle(e.id)}
                                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-emerald-100 active:scale-95"
                                  >
                                      <CheckCircle2 className="w-4 h-4" /> Settle
                                  </button>
                                  <button
                                      onClick={() => remove(e.id)}
                                      className="bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 w-12 flex items-center justify-center rounded-xl transition-colors shrink-0"
                                  >
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                              </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* YOU GET */}
                <div className="space-y-4">
                  <h3 className="text-gray-900 font-black text-xl px-1 flex items-center gap-2 mb-4">
                    <ArrowDownLeft className="w-6 h-6 text-emerald-500" /> You're Owed
                  </h3>
                  
                  {youGet.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-gray-500 font-medium">No one owes you money.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {youGet.map((e) => (
                          <div key={e.id} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-emerald-100 group hover:shadow-md transition-all flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 font-black flex items-center justify-center text-lg border border-emerald-100">
                                      {e.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-gray-900 text-xl truncate max-w-[120px]">{e.name}</span>
                                  </div>
                                  <span className="font-black text-emerald-600 text-2xl">₹{e.amount.toLocaleString('en-IN')}</span>
                              </div>

                              <div className="flex gap-3">
                                  <button
                                      onClick={() => settle(e.id)}
                                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-200 active:scale-95"
                                  >
                                      <CheckCircle2 className="w-5 h-5 text-white" /> Mark Settled
                                  </button>
                                  <button
                                      onClick={() => remove(e.id)}
                                      className="bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 w-12 flex items-center justify-center rounded-xl transition-colors shrink-0"
                                  >
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                              </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* HISTORY */}
              {history.length > 0 && (
                <div className="pt-8 border-t border-border/40">
                  <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                    <History className="w-5 h-5" /> Settle History
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {history.map((e) => (
                        <div key={e.id} className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-2xl text-base border border-gray-100 flex items-center justify-between hover:bg-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shadow-inner">
                                <CheckCircle2 className="w-5 h-5 text-white" fill="currentColor" />
                              </div>
                              <span className="font-bold text-gray-700">{e.name}</span>
                            </div>
                            <span className="font-black text-gray-400 line-through decoration-gray-300">₹{e.amount.toLocaleString('en-IN')}</span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
    );
}