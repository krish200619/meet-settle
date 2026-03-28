import { useState, useRef } from "react";
import { Camera, Loader2, Plus, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Member } from "@/lib/store";

interface ScannedItem {
  name: string;
  amount: number;
  assignedTo?: string;
}

interface BillScannerProps {
  members: Member[];
  onAddExpenses: (expenses: { description: string; amount: number; paidBy: string }[]) => void;
}

const BillScanner = ({ members, onAddExpenses }: BillScannerProps) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [paidBy, setPaidBy] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setPreview(base64);
      setScanning(true);
      setItems([]);

      try {
        const { data, error } = await supabase.functions.invoke("scan-receipt", {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const scannedItems: ScannedItem[] = (data.items || []).map(
          (item: { name: string; amount: number }) => ({
            name: item.name,
            amount: Math.round(item.amount * 100) / 100,
          })
        );
        setItems(scannedItems);
        toast.success(`Found ${scannedItems.length} items on the bill!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to scan receipt");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ScannedItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddAll = () => {
    if (!paidBy) {
      toast.error("Select who paid the bill");
      return;
    }
    if (items.length === 0) return;

    const expenses = items.map((item) => ({
      description: item.name,
      amount: item.amount,
      paidBy,
    }));
    onAddExpenses(expenses);
    toast.success(`Added ${items.length} expenses from bill!`);
    setOpen(false);
    setItems([]);
    setPreview(null);
    setPaidBy("");
  };

  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-12 rounded-xl gap-2 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5">
          <Camera className="w-5 h-5" /> Scan Bill with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> AI Bill Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Upload area */}
          {!preview && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Upload Receipt Photo</p>
              <p className="text-xs text-muted-foreground">JPG, PNG or PDF</p>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />

          {/* Preview */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Receipt" className="w-full max-h-48 object-cover" />
              {scanning && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">Scanning with AI...</p>
                  </div>
                </div>
              )}
              {!scanning && (
                <button
                  onClick={() => {
                    setPreview(null);
                    setItems([]);
                  }}
                  className="absolute top-2 right-2 bg-card rounded-full p-1 shadow"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Scanned items */}
          {items.length > 0 && (
            <>
              <p className="text-sm font-semibold text-foreground">
                Scanned Items ({items.length})
              </p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2"
                  >
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateItem(i, "amount", parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-sm text-right"
                    />
                    <button onClick={() => removeItem(i)} className="text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm font-bold border-t border-border pt-2">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">₹{total.toLocaleString("en-IN")}</span>
              </div>

              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Who paid the bill?" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddAll}
                className="w-full bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" /> Add All as Expenses
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillScanner;
