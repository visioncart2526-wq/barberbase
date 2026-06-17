"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { expenseCategories, paymentMethods } from "@/lib/constants";
import type { Barber, Expense, PaymentMethod, Profile, Service, ShopSettings, Transaction } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
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
import {
  decimalToPercent,
  formatCurrency,
  toDateInputValue,
  toDateTimeLocalValue,
} from "@/lib/utils";

type DeleteTarget = { table: "barbers" | "services" | "expenses" | "transactions"; id: string; label: string };

function RowActions({
  onEdit,
  onDelete,
  canDelete = true,
}: {
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-50"
        aria-label="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400 sm:top-3" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9`}
        placeholder={placeholder}
      />
    </label>
  );
}

async function deleteRow(target: DeleteTarget) {
  const supabase = createClient();
  return supabase.from(target.table).delete().eq("id", target.id);
}

export function BarbersPage({ settings }: { settings: ShopSettings | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active",
    start_date: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("barbers").select("*").order("name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Barber[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((row) =>
    [row.name, row.email, row.phone, row.status].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  function edit(row: Barber) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      status: row.status,
      start_date: toDateInputValue(row.start_date),
      notes: row.notes ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", status: "active", start_date: "", notes: "" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      status: form.status as "active" | "inactive",
      default_commission_rate: settings?.default_commission_rate ?? 0.5,
      start_date: form.start_date || null,
      notes: form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("barbers").update(payload).eq("id", editingId)
      : await supabase.from("barbers").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Barber updated" : "Barber added");
    reset();
    load();
  }

  return (
    <CrudFrame
      title="Barbers"
      description="Manage barber profiles, commission rates, and status"
      search={<SearchBox value={search} onChange={setSearch} placeholder="Search barbers" />}
      deleteTarget={deleteTarget}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={async () => {
        if (!deleteTarget) return;
        const { error } = await deleteRow(deleteTarget);
        if (error) toast.error(error.message);
        else toast.success("Barber deleted");
        setDeleteTarget(null);
        load();
      }}
      form={
        <form onSubmit={submit} className="space-y-4">
          <TextInput label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <TextInput label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <TextInput label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <SelectInput label="Status" value={form.status} onChange={(status) => setForm({ ...form, status })} options={["active", "inactive"]} />
          <LockedValue label="Commission rate" value={`${decimalToPercent(settings?.default_commission_rate ?? 0.5)}%`} />
          <TextInput label="Start date" type="date" value={form.start_date} onChange={(start_date) => setForm({ ...form, start_date })} />
          <TextareaInput label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
          <div className="grid gap-2 sm:flex">
            <button className={buttonClass} type="submit">{editingId ? "Save barber" : "Add barber"}</button>
            {editingId ? <button className={secondaryButtonClass} type="button" onClick={reset}>Cancel</button> : null}
          </div>
        </form>
      }
    >
      {loading ? <LoadingState /> : filtered.length ? (
        <ResponsiveTable
          headers={["Name", "Contact", "Status", "Commission", "Start date", ""]}
          rows={filtered.map((row) => [
            row.name,
            [row.email, row.phone].filter(Boolean).join(" / ") || "-",
            row.status,
            `${decimalToPercent(row.default_commission_rate)}%`,
            row.start_date ?? "-",
            <RowActions key={row.id} onEdit={() => edit(row)} onDelete={() => setDeleteTarget({ table: "barbers", id: row.id, label: row.name })} />,
          ])}
        />
      ) : <EmptyState title="No barbers found" description="Add the first barber or adjust your search." />}
    </CrudFrame>
  );
}

export function ServicesPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "Cuts", price: "", duration: "30", active: "true", description: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("services").select("*").order("name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((row) =>
    [row.name, row.category, row.description].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  function edit(row: Service) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      category: row.category,
      price: String(row.price),
      duration: String(row.duration_minutes),
      active: String(row.active),
      description: row.description ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm({ name: "", category: "Cuts", price: "", duration: "30", active: "true", description: "" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      duration_minutes: Number(form.duration),
      active: form.active === "true",
      description: form.description.trim() || null,
    };
    const result = editingId
      ? await supabase.from("services").update(payload).eq("id", editingId)
      : await supabase.from("services").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Service updated" : "Service added");
    reset();
    load();
  }

  return (
    <CrudFrame
      title="Services"
      description="Manage service menu, pricing, and duration"
      search={<SearchBox value={search} onChange={setSearch} placeholder="Search services" />}
      deleteTarget={deleteTarget}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={async () => {
        if (!deleteTarget) return;
        const { error } = await deleteRow(deleteTarget);
        if (error) toast.error(error.message);
        else toast.success("Service deleted");
        setDeleteTarget(null);
        load();
      }}
      form={
        <form onSubmit={submit} className="space-y-4">
          <TextInput label="Service name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <TextInput label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} required />
          <TextInput label="Price" type="number" min="0" step="0.01" value={form.price} onChange={(price) => setForm({ ...form, price })} required />
          <TextInput label="Estimated duration in minutes" type="number" min="1" value={form.duration} onChange={(duration) => setForm({ ...form, duration })} required />
          <SelectInput label="Active" value={form.active} onChange={(active) => setForm({ ...form, active })} options={["true", "false"]} />
          <TextareaInput label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
          <div className="grid gap-2 sm:flex">
            <button className={buttonClass} type="submit">{editingId ? "Save service" : "Add service"}</button>
            {editingId ? <button className={secondaryButtonClass} type="button" onClick={reset}>Cancel</button> : null}
          </div>
        </form>
      }
    >
      {loading ? <LoadingState /> : filtered.length ? (
        <ResponsiveTable
          headers={["Service", "Category", "Price", "Duration", "Active", ""]}
          rows={filtered.map((row) => [
            row.name,
            row.category,
            formatCurrency(row.price),
            `${row.duration_minutes} min`,
            row.active ? "Yes" : "No",
            <RowActions key={row.id} onEdit={() => edit(row)} onDelete={() => setDeleteTarget({ table: "services", id: row.id, label: row.name })} />,
          ])}
        />
      ) : <EmptyState title="No services found" description="Add services to start recording daily transactions." />}
    </CrudFrame>
  );
}

export function ExpensesPage({ settings }: { settings: ShopSettings | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Rent",
    vendor: "",
    amount: "",
    payment_method: "debit",
    recurring: "false",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((row) =>
    [row.category, row.vendor, row.payment_method, row.notes].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  function edit(row: Expense) {
    setEditingId(row.id);
    setForm({
      expense_date: toDateInputValue(row.expense_date),
      category: row.category,
      vendor: row.vendor,
      amount: String(row.amount),
      payment_method: row.payment_method,
      recurring: String(row.recurring),
      notes: row.notes ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm({ expense_date: new Date().toISOString().slice(0, 10), category: "Rent", vendor: "", amount: "", payment_method: "debit", recurring: "false", notes: "" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      vendor: form.vendor.trim(),
      amount: Number(form.amount),
      payment_method: form.payment_method as PaymentMethod,
      recurring: form.recurring === "true",
      notes: form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Expense updated" : "Expense added");
    reset();
    load();
  }

  return (
    <CrudFrame
      title="Expenses"
      description="Track operating costs and recurring expenses"
      search={<SearchBox value={search} onChange={setSearch} placeholder="Search expenses" />}
      deleteTarget={deleteTarget}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={async () => {
        if (!deleteTarget) return;
        const { error } = await deleteRow(deleteTarget);
        if (error) toast.error(error.message);
        else toast.success("Expense deleted");
        setDeleteTarget(null);
        load();
      }}
      form={
        <form onSubmit={submit} className="space-y-4">
          <TextInput label="Date" type="date" value={form.expense_date} onChange={(expense_date) => setForm({ ...form, expense_date })} required />
          <SelectInput label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} options={expenseCategories} />
          <TextInput label="Vendor/payee" value={form.vendor} onChange={(vendor) => setForm({ ...form, vendor })} required />
          <TextInput label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required />
          <SelectInput label="Payment method" value={form.payment_method} onChange={(payment_method) => setForm({ ...form, payment_method })} options={paymentMethods} />
          <SelectInput label="Recurring" value={form.recurring} onChange={(recurring) => setForm({ ...form, recurring })} options={["false", "true"]} />
          <TextareaInput label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
          <div className="grid gap-2 sm:flex">
            <button className={buttonClass} type="submit">{editingId ? "Save expense" : "Add expense"}</button>
            {editingId ? <button className={secondaryButtonClass} type="button" onClick={reset}>Cancel</button> : null}
          </div>
        </form>
      }
    >
      {loading ? <LoadingState /> : filtered.length ? (
        <ResponsiveTable
          headers={["Date", "Category", "Vendor", "Amount", "Payment", "Recurring", ""]}
          rows={filtered.map((row) => [
            row.expense_date,
            row.category,
            row.vendor,
            formatCurrency(row.amount, settings?.currency),
            row.payment_method,
            row.recurring ? "Yes" : "No",
            <RowActions key={row.id} onEdit={() => edit(row)} onDelete={() => setDeleteTarget({ table: "expenses", id: row.id, label: row.vendor })} />,
          ])}
        />
      ) : <EmptyState title="No expenses found" description="Record rent, supplies, subscriptions, payroll, and other costs." />}
    </CrudFrame>
  );
}

export function TransactionsPage({ profile, settings }: { profile: Profile; settings: ShopSettings | null }) {
  const supabase = createClient();
  const toast = useToast();
  const canManage = profile.role !== "barber";
  const [rows, setRows] = useState<Transaction[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    transaction_at: toDateTimeLocalValue(null),
    barber_id: profile.barber_id ?? "",
    service_id: "",
    customer_name: "",
    quantity: "1",
    discount_amount: "0",
    tip_amount: "0",
    payment_method: "cash",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const [transactionsResult, barbersResult, servicesResult] = await Promise.all([
      supabase.from("transactions").select("*, barbers(id,name), services(id,name,category,price)").order("transaction_at", { ascending: false }),
      supabase.from("barbers").select("*").eq("status", "active").order("name"),
      supabase.from("services").select("*").eq("active", true).order("name"),
    ]);
    if (transactionsResult.error) toast.error(transactionsResult.error.message);
    if (barbersResult.error) toast.error(barbersResult.error.message);
    if (servicesResult.error) toast.error(servicesResult.error.message);
    setRows((transactionsResult.data ?? []) as Transaction[]);
    setBarbers((barbersResult.data ?? []) as Barber[]);
    setServices((servicesResult.data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = services.find((service) => service.id === form.service_id);
  const selectedBarber = barbers.find((barber) => barber.id === form.barber_id);
  const gross = Math.max(0, Number(selectedService?.price ?? 0) * Number(form.quantity || 0) - Number(form.discount_amount || 0));
  const commissionRate = settings?.default_commission_rate ?? 0.5;
  const commissionPercent = decimalToPercent(commissionRate);
  const barberCommission = gross * commissionRate;
  const shopShare = gross - barberCommission;

  const filtered = rows.filter((row) =>
    [
      row.customer_name,
      row.payment_method,
      row.barbers?.name,
      row.services?.name,
      row.notes,
    ].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  function updateBarber(barberId: string) {
    setForm({
      ...form,
      barber_id: barberId,
    });
  }

  function edit(row: Transaction) {
    setEditingId(row.id);
    setForm({
      transaction_at: toDateTimeLocalValue(row.transaction_at),
      barber_id: row.barber_id,
      service_id: row.service_id,
      customer_name: row.customer_name ?? "",
      quantity: String(row.quantity),
      discount_amount: String(row.discount_amount),
      tip_amount: String(row.tip_amount),
      payment_method: row.payment_method,
      notes: row.notes ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm({
      transaction_at: toDateTimeLocalValue(null),
      barber_id: profile.barber_id ?? "",
      service_id: "",
      customer_name: "",
      quantity: "1",
      discount_amount: "0",
      tip_amount: "0",
      payment_method: "cash",
      notes: "",
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      transaction_at: new Date(form.transaction_at).toISOString(),
      barber_id: form.barber_id,
      service_id: form.service_id,
      customer_name: form.customer_name.trim() || null,
      quantity: Number(form.quantity),
      gross_amount: gross,
      discount_amount: Number(form.discount_amount || 0),
      tip_amount: Number(form.tip_amount || 0),
      payment_method: form.payment_method as PaymentMethod,
      commission_rate: commissionRate,
      barber_commission: barberCommission,
      shop_share: shopShare,
      notes: form.notes.trim() || null,
    };
    const result = editingId
      ? await supabase.from("transactions").update(payload).eq("id", editingId)
      : await supabase.from("transactions").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editingId ? "Transaction updated" : "Transaction added");
    reset();
    load();
  }

  return (
    <CrudFrame
      title="Sales / Transactions"
      description={canManage ? "Record daily services, payments, tips, commission, and shop share" : "View your sales, tips, commission, and performance"}
      search={<SearchBox value={search} onChange={setSearch} placeholder="Search sales" />}
      deleteTarget={deleteTarget}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={async () => {
        if (!deleteTarget) return;
        const { error } = await deleteRow(deleteTarget);
        if (error) toast.error(error.message);
        else toast.success("Transaction deleted");
        setDeleteTarget(null);
        load();
      }}
      form={canManage ? (
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <TextInput label="Date/time" type="datetime-local" value={form.transaction_at} onChange={(transaction_at) => setForm({ ...form, transaction_at })} required />
          <SelectInput label="Payment method" value={form.payment_method} onChange={(payment_method) => setForm({ ...form, payment_method })} options={paymentMethods} />
          <SelectInput label="Barber" value={form.barber_id} onChange={updateBarber} options={barbers.map((barber) => ({ value: barber.id, label: barber.name }))} required />
          <SelectInput label="Service" value={form.service_id} onChange={(service_id) => setForm({ ...form, service_id })} options={services.map((service) => ({ value: service.id, label: `${service.name} (${formatCurrency(service.price, settings?.currency)})` }))} required />
          <TextInput label="Customer name" value={form.customer_name} onChange={(customer_name) => setForm({ ...form, customer_name })} />
          <TextInput label="Quantity" type="number" min="1" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} required />
          <TextInput label="Discount" type="number" min="0" step="0.01" value={form.discount_amount} onChange={(discount_amount) => setForm({ ...form, discount_amount })} />
          <TextInput label="Tip amount" type="number" min="0" step="0.01" value={form.tip_amount} onChange={(tip_amount) => setForm({ ...form, tip_amount })} />
          <LockedValue label="Commission rate" value={`${commissionPercent}%`} />
          <TextareaInput label="Notes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} className="md:col-span-2 xl:col-span-1" />
          <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 md:col-span-2 xl:col-span-1">
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <AmountSummary label="Gross amount" value={formatCurrency(gross, settings?.currency)} />
              <AmountSummary label="Barber commission" value={formatCurrency(barberCommission, settings?.currency)} />
              <AmountSummary label="Shop share" value={formatCurrency(shopShare, settings?.currency)} />
            </div>
            <div className="mt-3 text-xs text-zinc-500">Tips are tracked separately and go fully to the barber by default.</div>
          </div>
          <div className="grid gap-2 md:col-span-2 sm:flex xl:col-span-1">
            <button className={buttonClass} type="submit" disabled={!selectedService || !selectedBarber}>{editingId ? "Save sale" : "Add sale"}</button>
            {editingId ? <button className={secondaryButtonClass} type="button" onClick={reset}>Cancel</button> : null}
          </div>
        </form>
      ) : null}
      formTitle="Record sale"
      formFirstOnTablet
    >
      {loading ? <LoadingState /> : filtered.length ? (
        <ResponsiveTable
          headers={["Date", "Barber", "Service", "Gross", "Tip", "Commission", "Payment", ""]}
          rows={filtered.map((row) => [
            new Date(row.transaction_at).toLocaleString(),
            row.barbers?.name ?? "-",
            row.services?.name ?? "-",
            formatCurrency(row.gross_amount, settings?.currency),
            formatCurrency(row.tip_amount, settings?.currency),
            formatCurrency(row.barber_commission, settings?.currency),
            row.payment_method,
            canManage ? <RowActions key={row.id} onEdit={() => edit(row)} onDelete={() => setDeleteTarget({ table: "transactions", id: row.id, label: row.customer_name ?? "sale" })} /> : "",
          ])}
        />
      ) : <EmptyState title="No transactions found" description="Add sales as barbers complete services, or adjust your filters." />}
    </CrudFrame>
  );
}

function CrudFrame({
  title,
  description,
  search,
  form,
  children,
  deleteTarget,
  onCancelDelete,
  onConfirmDelete,
  formTitle = "Details",
  formFirstOnTablet = false,
}: {
  title: string;
  description: string;
  search: React.ReactNode;
  form: React.ReactNode;
  children: React.ReactNode;
  deleteTarget: DeleteTarget | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  formTitle?: string;
  formFirstOnTablet?: boolean;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <section className={`min-w-0 space-y-4 ${formFirstOnTablet ? "order-2 xl:order-1" : ""}`}>
          {search}
          {children}
        </section>
        {form ? (
          <Card className={`p-4 sm:p-5 ${formFirstOnTablet ? "order-1 xl:order-2" : ""}`}>
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-950">{formTitle}</h2>
            </div>
            {form}
          </Card>
        ) : null}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.label ?? "record"}?`}
        message="This action cannot be undone. Existing reports will update after this record is removed."
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
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
        step={step}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className={labelClass}>{label}</span>
      <select
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      >
        <option value="">Select</option>
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className={labelClass}>{label}</span>
      <textarea
        className={`${inputClass} min-h-24`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LockedValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <span className={labelClass}>{label}</span>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
        <span className="font-medium text-zinc-950">{value}</span>
        <span className="text-xs text-zinc-500">Settings</span>
      </div>
    </div>
  );
}

function AmountSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3 ring-1 ring-zinc-200">
      <span className="block text-xs font-medium uppercase text-zinc-500">{label}</span>
      <strong className="mt-1 block break-words text-base text-zinc-950">{value}</strong>
    </div>
  );
}

export function ResponsiveTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {rows.map((row, rowIndex) => (
          <Card key={rowIndex} className="p-4">
            <dl className="space-y-3">
              {row.map((cell, cellIndex) => {
                const header = headers[cellIndex];
                if (!header) {
                  return cell ? (
                    <div key={cellIndex} className="pt-1">
                      {cell}
                    </div>
                  ) : null;
                }

                return (
                  <div key={cellIndex} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                    <dt className="text-xs font-medium uppercase text-zinc-500">{header}</dt>
                    <dd className="min-w-0 break-words text-sm text-zinc-800">{cell}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        ))}
      </div>
      <Card className="hidden min-w-0 overflow-hidden sm:block">
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-zinc-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-zinc-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </>
  );
}
