import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    };

    const settle = (id: number) => {
        const item = entries.find(e => e.id === id);
        if (!item) return;

        setEntries(entries.filter(e => e.id !== id));
        setHistory([item, ...history]);
    };

    const remove = (id: number) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const youOwe = entries.filter(e => e.type === "borrowed");
    const youGet = entries.filter(e => e.type === "lent");

    const totalOwe = youOwe.reduce((a, b) => a + b.amount, 0);
    const totalGet = youGet.reduce((a, b) => a + b.amount, 0);

    return (
        <div className="min-h-screen bg-gray-100 p-4 max-w-md mx-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate("/")} className="text-sm">
                    ⬅ Back
                </button>
                <h2 className="text-xl font-bold">💰 Personal</h2>
                <div />
            </div>

            {/* SUMMARY */}
            <div className="bg-white rounded-xl p-4 shadow mb-6">
                <p className="text-sm text-gray-500">Total Balance</p>

                <div className="flex justify-between mt-2">
                    <div>
                        <p className="text-xs text-red-500">You Owe</p>
                        <p className="font-bold text-red-500">₹{totalOwe}</p>
                    </div>

                    <div>
                        <p className="text-xs text-green-600">You Get</p>
                        <p className="font-bold text-green-600">₹{totalGet}</p>
                    </div>
                </div>
            </div>

            {/* ADD */}
            <div className="bg-white rounded-xl p-4 shadow mb-6 space-y-3">
                <input
                    className="w-full border p-2 rounded"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    className="w-full border p-2 rounded"
                    placeholder="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />

                <select
                    className="w-full border p-2 rounded"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                >
                    <option value="borrowed">I Owe</option>
                    <option value="lent">They Owe Me</option>
                </select>

                <button
                    onClick={addEntry}
                    className="w-full bg-black text-white p-2 rounded"
                >
                    Add Entry
                </button>
            </div>

            {/* YOU OWE */}
            <h3 className="text-red-500 font-semibold mb-2">You Owe</h3>
            {youOwe.map((e) => (
                <div key={e.id} className="bg-white p-4 rounded-xl mb-3 shadow">
                    <div className="flex justify-between">
                        <span>{e.name}</span>
                        <span className="font-bold text-red-500">₹{e.amount}</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => {
                                window.location.href = getUpiLink(e.name, e.amount);
                            }}
                            className="flex-1 bg-indigo-500 text-white py-2 rounded"
                        >
                            Pay
                        </button>

                        <button
                            onClick={() => settle(e.id)}
                            className="flex-1 bg-green-500 text-white py-2 rounded"
                        >
                            Settle
                        </button>

                        <button
                            onClick={() => remove(e.id)}
                            className="flex-1 bg-red-500 text-white py-2 rounded"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}

            {/* YOU GET */}
            <h3 className="text-green-600 font-semibold mt-4 mb-2">
                You Will Get
            </h3>
            {youGet.map((e) => (
                <div key={e.id} className="bg-white p-4 rounded-xl mb-3 shadow">
                    <div className="flex justify-between">
                        <span>{e.name}</span>
                        <span className="font-bold text-green-600">₹{e.amount}</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => settle(e.id)}
                            className="flex-1 bg-green-500 text-white py-2 rounded"
                        >
                            Settle
                        </button>

                        <button
                            onClick={() => remove(e.id)}
                            className="flex-1 bg-red-500 text-white py-2 rounded"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}

            {/* HISTORY */}
            <h3 className="text-gray-600 font-semibold mt-6 mb-2">History</h3>
            {history.map((e) => (
                <div key={e.id} className="bg-white p-3 rounded mb-2 text-sm shadow">
                    {e.name} - ₹{e.amount} ✅
                </div>
            ))}
        </div>
    );
}