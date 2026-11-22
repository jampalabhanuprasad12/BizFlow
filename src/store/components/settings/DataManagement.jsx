import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, RotateCcw, Database } from "lucide-react";
import { useData } from "../../store/index.js";
import { Button, Card } from "../ui/index.js";
import { ConfirmDialog } from "../customers/ConfirmDialog.jsx";
import {
  backupToJson,
  parseBackup,
  exportInvoicesCsv,
  exportPaymentsCsv,
  exportExpensesCsv,
  downloadText,
} from "../../lib/backup.js";
import { INDIAN_DEMO_DATA } from "../../data/indianDemoData.js";
import { todayISO } from "../../lib/invoices.js";

export function DataManagement() {
  const { data, replaceAllData } = useData();
  const fileRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  const recordCount =
    data.invoices.length + data.customers.length + data.payments.length + data.expenses.length;

  function notify(text, tone = "success") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    try {
      if (!file) return;
      if (file.size > 20000000) {
        notify("That file is too large to import (over 20 MB).", "error");
        return;
      }
      const text = await file.text();
      const result = parseBackup(text);
      if (!result.ok) {
        notify(result.error || "This file is not a valid BizFlow backup.", "error");
        return;
      }
      setPendingImport({ data: result.data, skipped: result.skipped });
      setConfirmImport(true);
    } catch (err) {
      notify("Could not read the file: " + (err?.message || "unknown error"), "error");
    } finally {
      event.target.value = "";
    }
  }

  function exportBackup() {
    downloadText(
      "bizflow-backup-" + todayISO() + ".json",
      backupToJson(data),
      "application/json;charset=utf-8"
    );
    notify("Backup downloaded.");
  }

  function exportCsv(filePrefix, buildCsv) {
    const csv = buildCsv(data);
    downloadText(filePrefix + "-" + todayISO() + ".csv", csv, "text/csv;charset=utf-8");
    notify("Downloaded " + filePrefix + " CSV.");
  }

  function confirmImportNow() {
    if (pendingImport) {
      replaceAllData(pendingImport.data);
      notify("Backup imported. Skipped " + pendingImport.skipped + " invalid records.");
    }
    setPendingImport(null);
    setConfirmImport(false);
  }

  function confirmDemoNow() {
    replaceAllData(INDIAN_DEMO_DATA);
    notify("Sample data loaded.");
    setConfirmDemo(false);
  }

  function confirmResetNow() {
    replaceAllData({ customers: [], invoices: [], payments: [], expenses: [], reminders: [], followUps: [] });
    notify("All records deleted.");
    setConfirmReset(false);
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Data management</h2>
        <p className="text-sm text-slate-600">
          Your data is stored only in this browser. Back it up regularly.
        </p>
      </div>

      <input
        type="file"
        accept="application/json,.json"
        ref={fileRef}
        onChange={handleFile}
        className="hidden"
        aria-label="Choose backup file"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button variant="secondary" onClick={exportBackup}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export all data (JSON)
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Import backup (JSON)
        </Button>
        <Button variant="secondary" onClick={() => exportCsv("invoices", exportInvoicesCsv)}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Export invoices (CSV)
        </Button>
        <Button variant="secondary" onClick={() => exportCsv("payments", exportPaymentsCsv)}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Export payments (CSV)
        </Button>
        <Button variant="secondary" onClick={() => exportCsv("expenses", exportExpensesCsv)}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Export expenses (CSV)
        </Button>
        <Button variant="secondary" onClick={() => setConfirmDemo(true)}>
          <Database className="h-4 w-4" aria-hidden="true" />
          Load sample data
        </Button>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset all data
        </Button>
      </div>

      {message ? (
        <p
          role={messageTone === "error" ? "alert" : "status"}
          className={messageTone === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}
        >
          {message}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmImport}
        title="Replace all data with this backup?"
        message={
          "The backup will replace the " +
          recordCount +
          " records currently in BizFlow. Export a backup first if you want to keep them."
        }
        confirmLabel="Replace data"
        tone="danger"
        onConfirm={confirmImportNow}
        onCancel={() => {
          setPendingImport(null);
          setConfirmImport(false);
        }}
      />

      <ConfirmDialog
        open={confirmDemo}
        title="Load sample data?"
        message="This replaces your current data with fictional sample customers, invoices, payments and expenses. Export a backup first if you want to keep your data."
        confirmLabel="Load sample data"
        tone="danger"
        onConfirm={confirmDemoNow}
        onCancel={() => setConfirmDemo(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This permanently deletes all customers, invoices, payments, expenses and follow-ups in this browser. Your business settings are kept. This cannot be undone."
        confirmLabel="Delete everything"
        tone="danger"
        onConfirm={confirmResetNow}
        onCancel={() => setConfirmReset(false)}
      />
    </Card>
  );
}
