"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, isBefore, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Barber, Expense, Profile, Service, ShopSettings, Transaction } from "@/lib/types";
import { Card, EmptyState, LoadingState, PageHeader } from "@/components/ui";
import { formatCurrency, formatNumber, monthRange, todayRange, weekRange } from "@/lib/utils";

const chartColors = ["#18181b", "#0f766e", "#b45309", "#4338ca", "#be123c", "#0369a1"];

type DashboardData = {
  transactions: Transaction[];
  expenses: Expense[];
  barbers: Barber[];
  services: Service[];
};

function inRange(value: string, start: string, end: string) {
  const date = parseISO(value);
  return !isBefore(date, parseISO(start)) && isBefore(date, parseISO(end));
}

function sum<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + Number(selector(row) || 0), 0);
}

export function DashboardPage({
  profile,
  settings,
}: {
  profile: Profile;
  settings: ShopSettings | null;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currency = settings?.currency || "USD";

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const [transactionsResult, expensesResult, barbersResult, servicesResult] =
        await Promise.all([
          supabase
            .from("transactions")
            .select("*, barbers(id,name), services(id,name,category,price)")
            .order("transaction_at", { ascending: false }),
          supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
          supabase.from("barbers").select("*").order("name"),
          supabase.from("services").select("*").order("name"),
        ]);

      const firstError =
        transactionsResult.error ||
        expensesResult.error ||
        barbersResult.error ||
        servicesResult.error;

      if (firstError) {
        setError(firstError.message);
      } else {
        setData({
          transactions: (transactionsResult.data ?? []) as Transaction[],
          expenses: (expensesResult.data ?? []) as Expense[],
          barbers: (barbersResult.data ?? []) as Barber[],
          services: (servicesResult.data ?? []) as Service[],
        });
      }
      setLoading(false);
    }

    load();
  }, []);

  const metrics = useMemo(() => {
    const transactions = data?.transactions ?? [];
    const expenses = data?.expenses ?? [];
    const today = todayRange();
    const week = weekRange();
    const month = monthRange();
    const todaysTransactions = transactions.filter((row) =>
      inRange(row.transaction_at, today.start, today.end),
    );
    const weekTransactions = transactions.filter((row) =>
      inRange(row.transaction_at, week.start, week.end),
    );
    const monthTransactions = transactions.filter((row) =>
      inRange(row.transaction_at, month.start, month.end),
    );
    const monthExpenses = expenses.filter((row) =>
      inRange(`${row.expense_date}T00:00:00.000Z`, month.start, month.end),
    );

    const barberSales = new Map<string, { name: string; gross: number }>();
    const serviceSales = new Map<string, { name: string; quantity: number }>();

    monthTransactions.forEach((row) => {
      const barberName = row.barbers?.name ?? "Unassigned";
      const serviceName = row.services?.name ?? "Unknown service";
      const barberCurrent = barberSales.get(row.barber_id) ?? { name: barberName, gross: 0 };
      barberSales.set(row.barber_id, {
        ...barberCurrent,
        gross: barberCurrent.gross + Number(row.gross_amount),
      });
      const serviceCurrent = serviceSales.get(row.service_id) ?? {
        name: serviceName,
        quantity: 0,
      };
      serviceSales.set(row.service_id, {
        ...serviceCurrent,
        quantity: serviceCurrent.quantity + Number(row.quantity),
      });
    });

    const topBarber =
      [...barberSales.values()].sort((a, b) => b.gross - a.gross)[0]?.name ?? "No sales yet";
    const topService =
      [...serviceSales.values()].sort((a, b) => b.quantity - a.quantity)[0]?.name ??
      "No services yet";
    const monthlyExpenses = sum(monthExpenses, (row) => Number(row.amount));
    const monthlyShopShare = sum(monthTransactions, (row) => Number(row.shop_share));

    return {
      todayGross: sum(todaysTransactions, (row) => Number(row.gross_amount)),
      todayNet: sum(todaysTransactions, (row) => Number(row.shop_share)),
      todayTips: sum(todaysTransactions, (row) => Number(row.tip_amount)),
      todayCustomers: sum(todaysTransactions, (row) => Number(row.quantity)),
      weekGross: sum(weekTransactions, (row) => Number(row.gross_amount)),
      monthGross: sum(monthTransactions, (row) => Number(row.gross_amount)),
      monthExpenses: monthlyExpenses,
      estimatedProfit: monthlyShopShare - monthlyExpenses,
      topBarber,
      topService,
    };
  }, [data]);

  const charts = useMemo(() => {
    const transactions = data?.transactions ?? [];
    const expenses = data?.expenses ?? [];
    const salesByDay = new Map<string, number>();
    const salesByBarber = new Map<string, number>();
    const expensesByCategory = new Map<string, number>();
    const paymentBreakdown = new Map<string, number>();

    transactions.forEach((row) => {
      const day = format(parseISO(row.transaction_at), "MMM d");
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(row.gross_amount));
      const barberName = row.barbers?.name ?? "Unassigned";
      salesByBarber.set(barberName, (salesByBarber.get(barberName) ?? 0) + Number(row.gross_amount));
      paymentBreakdown.set(
        row.payment_method,
        (paymentBreakdown.get(row.payment_method) ?? 0) + Number(row.gross_amount) + Number(row.tip_amount),
      );
    });

    expenses.forEach((row) => {
      expensesByCategory.set(row.category, (expensesByCategory.get(row.category) ?? 0) + Number(row.amount));
    });

    return {
      salesByDay: [...salesByDay.entries()]
        .slice(-14)
        .map(([name, value]) => ({ name, value })),
      salesByBarber: [...salesByBarber.entries()].map(([name, value]) => ({ name, value })),
      expensesByCategory: [...expensesByCategory.entries()].map(([name, value]) => ({
        name,
        value,
      })),
      paymentBreakdown: [...paymentBreakdown.entries()].map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading shop performance" />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={`Supabase returned: ${error}. Check your environment variables and schema setup.`}
      />
    );
  }

  const kpis = [
    ["Today's gross sales", formatCurrency(metrics.todayGross, currency)],
    ["Today's net shop income", formatCurrency(metrics.todayNet, currency)],
    ["Today's total tips", formatCurrency(metrics.todayTips, currency)],
    ["Customers served today", formatNumber(metrics.todayCustomers)],
    ["This week's gross sales", formatCurrency(metrics.weekGross, currency)],
    ["This month's gross sales", formatCurrency(metrics.monthGross, currency)],
    ["This month's expenses", formatCurrency(metrics.monthExpenses, currency)],
    ["Estimated monthly profit", formatCurrency(metrics.estimatedProfit, currency)],
    ["Top barber this month", metrics.topBarber],
    ["Top service this month", metrics.topService],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          profile.role === "barber"
            ? "Your sales, tips, commission, and performance"
            : "Shop income, barber performance, expenses, and profit"
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-zinc-950">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Sales by day" data={charts.salesByDay} currency={currency} type="bar" />
        <ChartCard title="Sales by barber" data={charts.salesByBarber} currency={currency} type="bar" />
        <ChartCard
          title="Expenses by category"
          data={charts.expensesByCategory}
          currency={currency}
          type="pie"
        />
        <ChartCard
          title="Payment method breakdown"
          data={charts.paymentBreakdown}
          currency={currency}
          type="pie"
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  currency,
  type,
}: {
  title: string;
  data: { name: string; value: number }[];
  currency: string;
  type: "bar" | "pie";
}) {
  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {data.length ? (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#18181b" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-72 items-center justify-center rounded-md bg-zinc-50 text-sm text-zinc-500">
          No data yet
        </div>
      )}
    </Card>
  );
}
