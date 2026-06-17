export type UserRole = "owner" | "admin" | "manager" | "barber";

export type BarberStatus = "active" | "inactive";

export type PaymentMethod =
  | "cash"
  | "debit"
  | "credit"
  | "e-transfer"
  | "gift card"
  | "other";

export type TipPolicy = "barber_keeps_all" | "shop_split" | "pooled";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  barber_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Barber = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: BarberStatus;
  default_commission_rate: number;
  start_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  transaction_at: string;
  barber_id: string;
  service_id: string;
  customer_name: string | null;
  quantity: number;
  gross_amount: number;
  discount_amount: number;
  tip_amount: number;
  payment_method: PaymentMethod;
  commission_rate: number;
  barber_commission: number;
  shop_share: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  barbers?: Pick<Barber, "id" | "name"> | null;
  services?: Pick<Service, "id" | "name" | "category" | "price"> | null;
};

export type Expense = {
  id: string;
  expense_date: string;
  category: string;
  vendor: string;
  amount: number;
  payment_method: PaymentMethod;
  recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopSettings = {
  id: string;
  shop_name: string;
  tax_rate: number;
  default_commission_rate: number;
  tip_policy: TipPolicy;
  currency: string;
  enable_tip_amount: boolean;
  enable_discount: boolean;
  enable_quantity: boolean;
  business_hours: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Profile>;
      };
      barbers: {
        Row: Barber;
        Insert: Omit<Partial<Barber>, "id" | "created_at" | "updated_at">;
        Update: Partial<Barber>;
      };
      services: {
        Row: Service;
        Insert: Omit<Partial<Service>, "id" | "created_at" | "updated_at">;
        Update: Partial<Service>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<
          Partial<Transaction>,
          "id" | "created_at" | "updated_at" | "barbers" | "services"
        >;
        Update: Partial<Transaction>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Partial<Expense>, "id" | "created_at" | "updated_at">;
        Update: Partial<Expense>;
      };
      shop_settings: {
        Row: ShopSettings;
        Insert: Omit<Partial<ShopSettings>, "created_at" | "updated_at">;
        Update: Partial<ShopSettings>;
      };
    };
  };
};
