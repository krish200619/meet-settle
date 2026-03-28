import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import type { Settlement } from "@/lib/store";
import { Bell } from "lucide-react";

interface SmartRemindersProps {
  settlements: Settlement[];
  getMemberName: (id: string) => string;
}

const funMessages = [
  (name: string, amount: string) => `Bro, ${name} still owes ${amount} 😅`,
  (name: string, amount: string) => `${name}, pay up ${amount} yaar! 💸`,
  (name: string, amount: string) => `Hey ${name}! ${amount} pending… chai pe charcha? ☕`,
  (name: string, amount: string) => `${name} owes ${amount}. Zomato split incoming? 🍕`,
  (name: string, amount: string) => `Reminder: ${name} → ${amount}. UPI kar do! 📱`,
  (name: string, amount: string) => `${name}, ${amount} baaki hai boss 🫡`,
  (name: string, amount: string) => `Chal ${name}, ${amount} de de. Dosti bani rahegi 🤝`,
];

const SmartReminders = ({ settlements, getMemberName }: SmartRemindersProps) => {
  const reminders = useMemo(() => {
    if (settlements.length === 0) return [];
    return settlements.map((s, i) => {
      const fromName = getMemberName(s.from);
      const amount = formatCurrency(s.amount);
      const msgFn = funMessages[i % funMessages.length];
      return {
        id: `${s.from}-${s.to}`,
        message: msgFn(fromName, amount),
        from: fromName,
        to: getMemberName(s.to),
        amount: s.amount,
      };
    });
  }, [settlements, getMemberName]);

  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Bell className="w-3.5 h-3.5" /> Smart Reminders
      </div>
      {reminders.map((r) => (
        <div
          key={r.id}
          className="bg-owe/10 border border-owe/20 rounded-xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300"
        >
          <span className="text-lg mt-0.5">🔔</span>
          <p className="text-sm font-medium text-foreground leading-snug">{r.message}</p>
        </div>
      ))}
    </div>
  );
};

export default SmartReminders;
