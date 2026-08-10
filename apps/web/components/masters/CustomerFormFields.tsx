"use client";

import { Input } from "@/components/ui/input";
import type { MasterFieldOption } from "@/components/masters/SimpleMasterCrudPage";

export type CustomerFormValues = {
  customerCode: string;
  name: string;
  nameKana: string;
  shortName: string;
  customerGroupId: string;
  postalCode: string;
  prefecture: string;
  address: string;
  phone: string;
  fax: string;
  contactName: string;
  contractStartDate: string;
  contractEndDate: string;
  isInternalTest: boolean;
  isActive: boolean;
};

export const emptyCustomerForm = (): CustomerFormValues => ({
  customerCode: "",
  name: "",
  nameKana: "",
  shortName: "",
  customerGroupId: "",
  postalCode: "",
  prefecture: "",
  address: "",
  phone: "",
  fax: "",
  contactName: "",
  contractStartDate: new Date().toISOString().slice(0, 10),
  contractEndDate: "",
  isInternalTest: false,
  isActive: true,
});

export function customerToForm(customer: {
  customerCode: string;
  name: string;
  nameKana?: string;
  shortName?: string;
  customerGroupId?: string | null;
  postalCode?: string;
  prefecture?: string;
  address?: string;
  phone?: string;
  fax?: string;
  contactName?: string;
  contractStartDate: string;
  contractEndDate?: string | null;
  isInternalTest: boolean;
  isActive?: boolean;
}): CustomerFormValues {
  return {
    customerCode: customer.customerCode,
    name: customer.name,
    nameKana: customer.nameKana ?? "",
    shortName: customer.shortName ?? "",
    customerGroupId: customer.customerGroupId ?? "",
    postalCode: customer.postalCode ?? "",
    prefecture: customer.prefecture ?? "",
    address: customer.address ?? "",
    phone: customer.phone ?? "",
    fax: customer.fax ?? "",
    contactName: customer.contactName ?? "",
    contractStartDate: customer.contractStartDate.slice(0, 10),
    contractEndDate: customer.contractEndDate?.slice(0, 10) ?? "",
    isInternalTest: customer.isInternalTest,
    isActive: customer.isActive ?? true,
  };
}

export function customerFormToPayload(form: CustomerFormValues) {
  return {
    ...form,
    customerGroupId: form.customerGroupId || null,
    contractEndDate: form.contractEndDate || null,
    nameKana: form.nameKana || undefined,
    shortName: form.shortName || undefined,
    postalCode: form.postalCode || undefined,
    prefecture: form.prefecture || undefined,
    address: form.address || undefined,
    phone: form.phone || undefined,
    fax: form.fax || undefined,
    contactName: form.contactName || undefined,
  };
}

type CustomerFormFieldsProps = {
  form: CustomerFormValues;
  onChange: (form: CustomerFormValues) => void;
  groupOptions?: MasterFieldOption[];
};

export function CustomerFormFields({ form, onChange, groupOptions = [] }: CustomerFormFieldsProps) {
  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="施設コード" value={form.customerCode} onChange={(e) => set("customerCode", e.target.value)} required />
      <Input label="施設名" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      <Input label="カナ" value={form.nameKana} onChange={(e) => set("nameKana", e.target.value)} />
      <Input label="略称" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} />
      <div>
        <label className="mb-1 block text-[12px] font-medium text-muted">施設グループ</label>
        <select
          value={form.customerGroupId}
          onChange={(e) => set("customerGroupId", e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="">未設定</option>
          {groupOptions.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <Input label="郵便番号" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      <Input label="都道府県" value={form.prefecture} onChange={(e) => set("prefecture", e.target.value)} />
      <Input label="住所" value={form.address} onChange={(e) => set("address", e.target.value)} className="sm:col-span-2" />
      <Input label="電話番号" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      <Input label="FAX" value={form.fax} onChange={(e) => set("fax", e.target.value)} />
      <Input label="担当者名" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
      <Input label="契約開始日" type="date" value={form.contractStartDate} onChange={(e) => set("contractStartDate", e.target.value)} required />
      <Input label="契約終了日" type="date" value={form.contractEndDate} onChange={(e) => set("contractEndDate", e.target.value)} />
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={form.isInternalTest} onChange={(e) => set("isInternalTest", e.target.checked)} />
        テスト用施設
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        有効
      </label>
    </div>
  );
}
