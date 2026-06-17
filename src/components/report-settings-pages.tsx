"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { defaultBusinessHours, paymentMethods, tipPolicies } from "@/lib/constants";
import type { Barber, Expense, Profile, Service, ShopSettings, TipPolicy, Transaction } from "@/lib/types";
import {
  buttonClass,
  Card,
  EmptyState,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { ResponsiveTable } from "@/components/management-pages";
import { useToast } from "@/components/toast";
import { decimalToPercent, downloadCsv, formatCurrency, percentToDecimal } from "@/lib/utils";

type ReportData = {
  transactions: Transaction[];
  expenses: Expense[];
  barbers: Barber[];
  services: Service[];
};

function between(dateValue: string, start: string, end: string) {
  const value = dateValue.slice(0, 10);
  return (!start || value >= start) && (!end || value <= end);
}

function sum<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + Number(selector(row) || 0), 0);
}

export function ReportsPage({ settings }: { settings: ShopSettings | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    barber: "",
    payment: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [transactionsResult, expensesResult, barbersResult, servicesResult] = await Promise.all([
        supabase.from("transactions").select("*, barbers(id,name), services(id,name,category,price)").order("transaction_at", { ascending: false }),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("barbers").select("*").order("name"),
        supabase.from("services").select("*").order("name"),
      ]);
      const error = transactionsResult.error || expensesResult.error || barbersResult.error || servicesResult.error;
      if (error) toast.error(error.message);
      setData({
        transactions: (transactionsResult.data ?? []) as Transaction[],
        expenses: (expensesResult.data ?? []) as Expense[],
        barbers: (barbersResult.data ?? []) as Barber[],
        services: (servicesResult.data ?? []) as Service[],
      });
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTransactions = useMemo(() => {
    const rows = data?.transactions ?? [];
    return rows.filter((row) => {
      return (
        between(row.transaction_at, filters.start, filters.end) &&
        (!filters.barber || row.barber_id === filters.barber) &&
        (!filters.payment || row.payment_method === filters.payment)
      );
    });
  }, [data, filters]);

  const filteredExpenses = useMemo(() => {
    const rows = data?.expenses ?? [];
    return rows.filter((row) => between(row.expense_date, filters.start, filters.end));
  }, [data, filters.start, filters.end]);

  const reportRows = useMemo(() => {
    const byBarber = new Map<string, { barber: string; services: number; gross: number; tips: number; commission: number; shopShare: number }>();
    filteredTransactions.forEach((row) => {
      const name = row.barbers?.name ?? "Unassigned";
      const current = byBarber.get(row.barber_id) ?? { barber: name, services: 0, gross: 0, tips: 0, commission: 0, shopShare: 0 };
      byBarber.set(row.barber_id, {
        barber: name,
        services: current.services + Number(row.quantity),
        gross: current.gross + Number(row.gross_amount),
        tips: current.tips + Number(row.tip_amount),
        commission: current.commission + Number(row.barber_commission),
        shopShare: current.shopShare + Number(row.shop_share),
      });
    });
    return [...byBarber.values()].sort((a, b) => b.gross - a.gross);
  }, [filteredTransactions]);

  const totals = {
    gross: sum(filteredTransactions, (row) => Number(row.gross_amount)),
    tips: sum(filteredTransactions, (row) => Number(row.tip_amount)),
    commission: sum(filteredTransactions, (row) => Number(row.barber_commission)),
    shopShare: sum(filteredTransactions, (row) => Number(row.shop_share)),
    expenses: sum(filteredExpenses, (row) => Number(row.amount)),
  };

  const profit = totals.shopShare - totals.expenses;

  function exportReport() {
    const rows = filteredTransactions.map((row) => ({
      Date: new Date(row.transaction_at).toLocaleString(),
      Barber: row.barbers?.name ?? "Unassigned",
      Service: row.services?.name ?? "Unknown service",
      Customer: row.customer_name ?? "",
      Quantity: row.quantity,
      Gross: row.gross_amount,
      Tip: row.tip_amount,
      Commission: row.barber_commission,
      "Shop Share": row.shop_share,
      Payment: row.payment_method,
      Notes: row.notes ?? "",
    }));
    downloadCsv(`barberbase-report-${filters.start}-to-${filters.end}.csv`, rows);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Daily, weekly, monthly, barber income, expense, and profit reports"
        action={
          <button className={secondaryButtonClass} type="button" onClick={exportReport} disabled={!filteredTransactions.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />
      <Card className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <FilterInput label="Start date" type="date" value={filters.start} onChange={(start) => setFilters({ ...filters, start })} />
        <FilterInput label="End date" type="date" value={filters.end} onChange={(end) => setFilters({ ...filters, end })} />
        <label className="space-y-2">
          <span className={labelClass}>Barber</span>
          <select className={inputClass} value={filters.barber} onChange={(event) => setFilters({ ...filters, barber: event.target.value })}>
            <option value="">All barbers</option>
            {(data?.barbers ?? []).map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Payment method</span>
          <select className={inputClass} value={filters.payment} onChange={(event) => setFilters({ ...filters, payment: event.target.value })}>
            <option value="">All methods</option>
            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <SummaryCard label="Gross sales" value={formatCurrency(totals.gross, settings?.currency)} />
        <SummaryCard label="Tips" value={formatCurrency(totals.tips, settings?.currency)} />
        <SummaryCard label="Commission" value={formatCurrency(totals.commission, settings?.currency)} />
        <SummaryCard label="Expenses" value={formatCurrency(totals.expenses, settings?.currency)} />
        <SummaryCard label="Profit and loss" value={formatCurrency(profit, settings?.currency)} />
      </div>
      {reportRows.length ? (
        <ResponsiveTable
          headers={["Barber", "Services", "Gross", "Tips", "Commission", "Shop share"]}
          rows={reportRows.map((row) => [
            row.barber,
            row.services,
            formatCurrency(row.gross, settings?.currency),
            formatCurrency(row.tips, settings?.currency),
            formatCurrency(row.commission, settings?.currency),
            formatCurrency(row.shopShare, settings?.currency),
          ])}
        />
      ) : (
        <EmptyState title="No report data" description="Try a wider date range or remove filters." />
      )}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-950">Transaction history</h2>
        {filteredTransactions.length ? (
          <ResponsiveTable
            headers={["Date", "Barber", "Service", "Customer", "Gross", "Tip", "Commission", "Payment"]}
            rows={filteredTransactions.map((row) => [
              new Date(row.transaction_at).toLocaleString(),
              row.barbers?.name ?? "-",
              row.services?.name ?? "-",
              row.customer_name ?? "-",
              formatCurrency(row.gross_amount, settings?.currency),
              formatCurrency(row.tip_amount, settings?.currency),
              formatCurrency(row.barber_commission, settings?.currency),
              row.payment_method,
            ])}
          />
        ) : (
          <EmptyState title="No transactions found" description="Try a wider date range or remove filters." />
        )}
      </div>
    </div>
  );
}

export function PerformancePage({
  profile,
  settings,
}: {
  profile: Profile;
  settings: ShopSettings | null;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("transactions")
        .select("*, barbers(id,name), services(id,name,category,price)")
        .order("transaction_at", { ascending: false });
      if (profile.role === "barber" && profile.barber_id) {
        query = query.eq("barber_id", profile.barber_id);
      }
      const { data, error } = await query;
      if (error) toast.error(error.message);
      setRows((data ?? []) as Transaction[]);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.barber_id, profile.role]);

  const performance = useMemo(() => {
    const byBarber = new Map<string, {
      barber: string;
      services: number;
      gross: number;
      tips: number;
      commission: number;
      bestService: string;
      serviceCounts: Map<string, number>;
    }>();
    rows.forEach((row) => {
      const current = byBarber.get(row.barber_id) ?? {
        barber: row.barbers?.name ?? "Unassigned",
        services: 0,
        gross: 0,
        tips: 0,
        commission: 0,
        bestService: "No services yet",
        serviceCounts: new Map<string, number>(),
      };
      const serviceName = row.services?.name ?? "Unknown service";
      current.serviceCounts.set(serviceName, (current.serviceCounts.get(serviceName) ?? 0) + Number(row.quantity));
      current.services += Number(row.quantity);
      current.gross += Number(row.gross_amount);
      current.tips += Number(row.tip_amount);
      current.commission += Number(row.barber_commission);
      current.bestService = [...current.serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No services yet";
      byBarber.set(row.barber_id, current);
    });
    return [...byBarber.values()]
      .map((row) => ({ ...row, averageSale: row.services ? row.gross / row.services : 0 }))
      .sort((a, b) => b.gross - a.gross);
  }, [rows]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barber Performance"
        description="Services completed, sales, tips, commission, average ticket, best service, and ranking"
      />
      {performance.length ? (
        <ResponsiveTable
          headers={["Rank", "Barber", "Services", "Gross", "Tips", "Commission", "Average sale", "Best service"]}
          rows={performance.map((row, index) => [
            `#${index + 1}`,
            row.barber,
            row.services,
            formatCurrency(row.gross, settings?.currency),
            formatCurrency(row.tips, settings?.currency),
            formatCurrency(row.commission, settings?.currency),
            formatCurrency(row.averageSale, settings?.currency),
            row.bestService,
          ])}
        />
      ) : (
        <EmptyState title="No performance yet" description="Performance appears after transactions are recorded." />
      )}
    </div>
  );
}

export function SettingsPage({ settings }: { settings: ShopSettings | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [form, setForm] = useState({
    shop_name: settings?.shop_name ?? "Nonoy Masing",
    tax_rate: String(decimalToPercent(settings?.tax_rate ?? 0)),
    default_commission_rate: String(decimalToPercent(settings?.default_commission_rate ?? 0.5)),
    tip_policy: settings?.tip_policy ?? "barber_keeps_all",
    currency: settings?.currency ?? "USD",
    business_hours: JSON.stringify(settings?.business_hours ?? defaultBusinessHours, null, 2),
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    let businessHours: Record<string, string>;
    try {
      businessHours = JSON.parse(form.business_hours) as Record<string, string>;
    } catch {
      toast.error("Business hours must be valid JSON.");
      setSaving(false);
      return;
    }

    const payload = {
      id: settings?.id,
      shop_name: form.shop_name.trim(),
      tax_rate: percentToDecimal(Number(form.tax_rate)),
      default_commission_rate: percentToDecimal(Number(form.default_commission_rate)),
      tip_policy: form.tip_policy,
      currency: form.currency.trim().toUpperCase(),
      business_hours: businessHours,
    };

    const result = settings?.id
      ? await supabase.from("shop_settings").update(payload).eq("id", settings.id)
      : await supabase.from("shop_settings").insert(payload);

    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure shop defaults, currency, tip policy, tax, and hours" />
      <Card className="max-w-2xl p-4 sm:p-5">
        <form onSubmit={submit} className="space-y-4">
          <FilterInput label="Shop name" value={form.shop_name} onChange={(shop_name) => setForm({ ...form, shop_name })} required />
          <FilterInput label="Tax rate (%)" type="number" min="0" max="100" value={form.tax_rate} onChange={(tax_rate) => setForm({ ...form, tax_rate })} />
          <FilterInput label="Default commission rate (%)" type="number" min="0" max="100" value={form.default_commission_rate} onChange={(default_commission_rate) => setForm({ ...form, default_commission_rate })} />
          <label className="space-y-2">
            <span className={labelClass}>Tip policy</span>
            <select className={inputClass} value={form.tip_policy} onChange={(event) => setForm({ ...form, tip_policy: event.target.value as TipPolicy })}>
              {tipPolicies.map((policy) => <option key={policy.value} value={policy.value}>{policy.label}</option>)}
            </select>
          </label>
          <FilterInput label="Currency" value={form.currency} onChange={(currency) => setForm({ ...form, currency })} maxLength={3} required />
          <label className="space-y-2">
            <span className={labelClass}>Business hours JSON</span>
            <textarea className={`${inputClass} min-h-56 font-mono`} value={form.business_hours} onChange={(event) => setForm({ ...form, business_hours: event.target.value })} />
          </label>
          <button type="submit" className={buttonClass} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className="mt-3 break-words text-xl font-semibold text-zinc-950">{value}</p>
    </Card>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  min,
  max,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        max={max}
        maxLength={maxLength}
      />
    </label>
  );
}
