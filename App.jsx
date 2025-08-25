import React, { useEffect, useState } from "react";

// Utils
const uid = () => Math.random().toString(36).slice(2);
const todayYYYYMM = () => new Date().toISOString().slice(0, 7);
const money = (n) => (isNaN(+n) ? "-" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(+n));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "-");

// Utility to trigger a file download in the browser
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

const DEFAULT_ACCOUNTS = [
  { id: "caja", name: "Caja" },
  { id: "banco", name: "Banco" },
  { id: "mp", name: "Mercado Pago" },
];

const STORAGE_KEY = "conta_app_v1";

export default function App() {
  const [month, setMonth] = useState(todayYYYYMM());
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("captura");

  // load from storage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.accounts) setAccounts(data.accounts);
        if (data.transactions) setTransactions(data.transactions);
      } catch (e) {
        console.error("Error parsing storage", e);
      }
    }
  }, []);

  // save to storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, transactions }));
  }, [accounts, transactions]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Panel contable</h1>

      <nav className="flex gap-2 mb-6">
        {[
          { id: "captura", label: "Capturar" },
          { id: "libro", label: "Libro diario" },
          { id: "config", label: "Config / Backup" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 rounded ${tab === t.id ? "bg-black text-white" : "bg-gray-100"}`}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "captura" && <CaptureForm accounts={accounts} setTransactions={setTransactions} />}
      {tab === "libro" && <Ledger txs={transactions.filter((t) => t.month === month)} />}
      {tab === "config" && <ConfigView accounts={accounts} setAccounts={setAccounts} transactions={transactions} />}
    </div>
  );
}

function CaptureForm({ accounts, setTransactions }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("venta");
  const [amount, setAmount] = useState(0);
  const [account, setAccount] = useState(accounts[0].id);

  const addTx = () => {
    const tx = {
      id: uid(),
      date,
      month: date.slice(0, 7),
      type,
      account,
      amount: Number(amount),
    };
    setTransactions((prev) => [...prev, tx]);
  };

  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="text-lg mb-2 font-semibold">Agregar movimiento</h2>
      <div className="flex flex-col gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="border p-2 rounded">
          <option value="venta">Venta</option>
          <option value="compra">Compra</option>
          <option value="gasto">Gasto</option>
        </select>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="border p-2 rounded" placeholder="Monto" />
        <select value={account} onChange={(e) => setAccount(e.target.value)} className="border p-2 rounded">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button onClick={addTx} className="px-3 py-2 bg-black text-white rounded">Agregar</button>
      </div>
    </div>
  );
}

function Ledger({ txs }) {
  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="text-lg mb-2 font-semibold">Libro diario</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Fecha</th>
            <th className="text-left">Tipo</th>
            <th className="text-left">Cuenta</th>
            <th className="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id}>
              <td>{fmtDate(t.date)}</td>
              <td>{t.type}</td>
              <td>{t.account}</td>
              <td className="text-right">{money(t.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfigView({ accounts, setAccounts, transactions }) {
  const addAccount = () => {
    const nameRaw = prompt("Nombre de la nueva cuenta:");
    const name = (nameRaw || "").trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "_");
    if (accounts.some(a => a.id === id)) { alert("Ya existe una cuenta con ese nombre."); return; }
    setAccounts(prev => [...prev, { id, name }]);
  };

  const exportCSV = () => {
    const headers = ["id","date","month","type","account","amount"];
    const lines = [headers.join(",")];
    transactions.forEach((t) => {
      lines.push([t.id, t.date, t.month, t.type, t.account, t.amount].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `conta_export_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="text-lg mb-2 font-semibold">Config / Backup</h2>
      <ul className="mb-4 list-disc list-inside">
        {accounts.map(a => <li key={a.id}>{a.name}</li>)}
      </ul>
      <div className="flex gap-2">
        <button onClick={addAccount} className="px-3 py-2 border rounded">Agregar cuenta</button>
        <button onClick={exportCSV} className="px-3 py-2 border rounded">Exportar CSV</button>
      </div>
    </div>
  );
}

