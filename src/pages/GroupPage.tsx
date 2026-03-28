import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getGroup,
  addExpense,
  simplifyDebts,
  deleteExpense,
  getUpiLink,
  type Group,
} from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";

const GroupPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | undefined>();
  const [tab, setTab] = useState<"expenses" | "settle">("expenses");

  // NEW STATES
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const reload = () => {
    const g = getGroup(id!);
    setGroup(g);
  };

  useEffect(() => {
    reload();
  }, [id]);

  // SELECT ALL BY DEFAULT
  useEffect(() => {
    if (group) {
      setSelectedMembers(group.members.map((m) => m.id));
      if (group.members.length > 0) {
        setPaidBy(group.members[0].id);
      }
    }
  }, [group]);

  if (!group) return <p>Group not found</p>;

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
      alert("Select at least 1 person");
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
    reload();
  };

  const total = group.expenses.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 max-w-md mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate("/")}>
          <ArrowLeft />
        </button>

        <h2 className="text-xl font-bold">{group.name}</h2>

        <button onClick={handleShare}>
          <Share2 />
        </button>
      </div>

      {/* MEMBERS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {group.members.map((m) => (
          <span key={m.id} className="bg-white px-3 py-1 rounded-full text-sm shadow">
            {m.name}
          </span>
        ))}
      </div>

      {/* TOTAL */}
      <p className="text-center text-gray-600 font-medium mb-3">
        Total: <span className="font-bold text-black">₹{total}</span>
      </p>

      {/* TABS */}
      <div className="flex mb-4 bg-white rounded-xl shadow overflow-hidden">
        <button
          onClick={() => setTab("expenses")}
          className={`flex-1 p-3 ${tab === "expenses" ? "bg-black text-white" : "text-gray-500"}`}
        >
          Expenses
        </button>

        <button
          onClick={() => setTab("settle")}
          className={`flex-1 p-3 ${tab === "settle" ? "bg-black text-white" : "text-gray-500"}`}
        >
          Settle Up
        </button>
      </div>

      {/* EXPENSE TAB */}
      {tab === "expenses" && (
        <>
          {/* ADD EXPENSE */}
          <div className="bg-white p-4 rounded-xl shadow mb-4 space-y-3">

            <input
              className="w-full border p-2 rounded"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {/* PAID BY */}
            <select
              className="w-full border p-2 rounded"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* 🔥 SELECT MEMBERS */}
            <div>
              <p className="text-sm font-medium mb-1">Split With:</p>
              {group.members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, m.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== m.id));
                      }
                    }}
                  />
                  {m.name}
                </label>
              ))}
            </div>

            <button
              onClick={handleAddExpense}
              className="w-full bg-blue-600 text-white p-2 rounded-xl"
            >
              + Add Expense
            </button>
          </div>

          {/* LIST */}
          {group.expenses.map((exp) => (
            <div key={exp.id} className="bg-white p-4 rounded-xl mb-3 shadow">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{exp.description}</p>
                  <p className="text-sm text-gray-500">
                    Paid by {getMemberName(exp.paidBy)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="font-bold">₹{exp.amount}</p>
                  <button
                    onClick={() => {
                      deleteExpense(group.id, exp.id);
                      reload();
                    }}
                    className="text-red-500"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* SETTLE TAB */}
      {tab === "settle" && (
        <>
          {settlements.map((s, i) => {
            const from = getMemberName(s.from);
            const to = getMemberName(s.to);
            const toMember = group.members.find((m) => m.id === s.to);

            return (
              <div key={i} className="bg-white p-4 rounded-xl mb-3 shadow">
                <p className="font-semibold">
                  {from} → {to}
                </p>

                <p className="text-lg font-bold text-red-500">
                  ₹{s.amount}
                </p>

                {toMember?.upiId && (
                  <button
                    onClick={() => {
                      const link = getUpiLink(
                        toMember.upiId!,
                        to,
                        s.amount
                      );
                      window.location.href = link;
                    }}
                    className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg"
                  >
                    Pay via UPI
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default GroupPage;