import type { PaymentMethod, TipPolicy, UserRole } from "@/lib/types";

export const paymentMethods: PaymentMethod[] = [
  "cash",
  "debit",
  "credit",
  "e-transfer",
  "gift card",
  "other",
];

export const expenseCategories = [
  "Rent",
  "Utilities",
  "Supplies",
  "Cleaning",
  "Repairs and maintenance",
  "Products",
  "Software/subscriptions",
  "Marketing",
  "Payroll",
  "Insurance",
  "Miscellaneous",
];

export const serviceExamples = [
  "Haircut",
  "Skin fade",
  "Beard trim",
  "Haircut + beard",
  "Kids cut",
  "Senior cut",
  "Hot towel shave",
];

export const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  barber: "Barber",
};

export const tipPolicies: { value: TipPolicy; label: string }[] = [
  { value: "barber_keeps_all", label: "Tips go fully to barber" },
  { value: "shop_split", label: "Split tips with shop" },
  { value: "pooled", label: "Pooled tips" },
];

export const defaultBusinessHours = {
  monday: "9:00 AM - 6:00 PM",
  tuesday: "9:00 AM - 6:00 PM",
  wednesday: "9:00 AM - 6:00 PM",
  thursday: "9:00 AM - 7:00 PM",
  friday: "9:00 AM - 7:00 PM",
  saturday: "9:00 AM - 5:00 PM",
  sunday: "Closed",
};
