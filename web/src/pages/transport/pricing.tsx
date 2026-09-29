import React, { useMemo } from 'react';
import { MasterPage } from '../masters/common/MasterPage';
import type { FormField } from '../masters/common/MasterPage';
import {
  useTransportPricings,
  useCreateTransportPricing,
  useUpdateTransportPricing,
  useDeleteTransportPricing,
} from '@/api/hooks/masters/transportPricing';
import { useVehicles } from '@/api/hooks/masters/vehicles';
import { useRoutes } from '@/api/hooks/masters/routes';
import { PermissionGuard } from '@/components/common';
import type { TransportPricing, TransportPricingInput } from '@/types/masters/transportPricing';
import Select from 'react-select';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldX } from 'lucide-react';

const BILLING_CYCLE_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'semester', label: 'Semester' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const formFields: FormField[] = [
  { name: 'vehicle_id', label: 'Vehicle', required: true },
  { name: 'route_id', label: 'Route' },
  { name: 'billing_cycle', label: 'Billing Cycle', required: true },
  { name: 'cycle_name', label: 'Cycle Name', required: true },
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'is_active', label: 'Active', type: 'checkbox' },
];

const defaultValues: TransportPricingInput = {
  vehicle_id: '',
  route_id: null,
  billing_cycle: 'annual',
  cycle_name: '',
  amount: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  is_active: true,
};

export default function TransportPricingPage() {
  const { data: pricings = [], isLoading } = useTransportPricings();
  const { data: vehicles = [] } = useVehicles();
  const { data: routes = [] } = useRoutes();
  const createMutation = useCreateTransportPricing();
  const updateMutation = useUpdateTransportPricing();
  const deleteMutation = useDeleteTransportPricing();

  const columns = useMemo(() => [
    { key: 'id', label: 'ID' },
    {
      key: 'vehicle_id',
      label: 'Vehicle',
      editable: true,
      render: (_value: any, row: TransportPricing) =>
        row.vehicle_name || vehicles.find(v => v.id === row.vehicle_id)?.name || row.vehicle_id,
      renderEdit: (value: any, _row: TransportPricing, onChange: (val: any) => void) => {
        const vehicleOptions = vehicles.map(v => ({
          value: v.id,
          label: `${v.name} (${v.registration_number})`,
        }));
        return (
          <Select
            options={vehicleOptions}
            value={vehicleOptions.find(opt => opt.value === value) || null}
            onChange={(option: any) => onChange(option?.value || '')}
            placeholder="Select Vehicle"
            classNamePrefix="react-select"
            menuPlacement="auto"
            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
              menu: base => ({ ...base, pointerEvents: 'auto' }),
              control: base => ({ ...base, minHeight: '32px', fontSize: '12px' }),
            }}
            isClearable={false}
            menuShouldBlockScroll={false}
            closeMenuOnScroll={false}
            tabSelectsValue={false}
            openMenuOnFocus={true}
            blurInputOnSelect={true}
          />
        );
      },
    },
    {
      key: 'route_id',
      label: 'Route',
      editable: true,
      render: (_value: any, row: TransportPricing) =>
        row.route_name || routes.find(r => r.id === row.route_id)?.route_name || '—',
      renderEdit: (value: any, _row: TransportPricing, onChange: (val: any) => void) => {
        const routeOptions = routes.map(r => ({
          value: r.id,
          label: r.route_name,
        }));
        return (
          <Select
            options={routeOptions}
            value={routeOptions.find(opt => opt.value === value) || null}
            onChange={(option: any) => onChange(option?.value || null)}
            placeholder="Select Route"
            classNamePrefix="react-select"
            menuPlacement="auto"
            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
              menu: base => ({ ...base, pointerEvents: 'auto' }),
              control: base => ({ ...base, minHeight: '32px', fontSize: '12px' }),
            }}
            isClearable={true}
            menuShouldBlockScroll={false}
            closeMenuOnScroll={false}
            tabSelectsValue={false}
            openMenuOnFocus={true}
            blurInputOnSelect={true}
          />
        );
      },
    },
    {
      key: 'billing_cycle',
      label: 'Billing Cycle',
      editable: true,
      render: (value: string) => {
        const opt = BILLING_CYCLE_OPTIONS.find(o => o.value === value);
        return opt?.label || value || '—';
      },
      renderEdit: (value: any, _row: TransportPricing, onChange: (val: any) => void) => (
        <Select
          options={BILLING_CYCLE_OPTIONS}
          value={BILLING_CYCLE_OPTIONS.find(opt => opt.value === value) || null}
          onChange={(option: any) => onChange(option?.value || '')}
          placeholder="Select Cycle"
          classNamePrefix="react-select"
          menuPlacement="auto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
            menu: base => ({ ...base, pointerEvents: 'auto' }),
            control: base => ({ ...base, minHeight: '32px', fontSize: '12px' }),
          }}
          menuShouldBlockScroll={false}
          closeMenuOnScroll={false}
          tabSelectsValue={false}
          openMenuOnFocus={true}
          blurInputOnSelect={true}
        />
      ),
    },
    { key: 'cycle_name', label: 'Cycle Name', editable: true },
    {
      key: 'amount',
      label: 'Amount',
      editable: true,
      render: (value: number | string) => value ? `₹${Number(value).toLocaleString()}` : '—',
    },
    { key: 'start_date', label: 'Start Date', editable: true },
    { key: 'end_date', label: 'End Date', editable: true },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (_value: any, row: TransportPricing) => (
        <StatusBadge status={row.is_active} />
      ),
      renderEdit: (value: any, _row: TransportPricing, onChange: (val: any) => void) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      ),
    },
  ], [vehicles, routes]);

  const renderCustomField = (field: FormField, value: any, onChange: (val: any) => void) => {
    if (field.name === 'vehicle_id') {
      const vehicleOptions = vehicles.map(v => ({
        value: v.id,
        label: `${v.name} (${v.registration_number})`,
      }));
      return (
        <Select
          options={vehicleOptions}
          value={vehicleOptions.find(opt => opt.value === value) || null}
          onChange={(option: any) => onChange(option?.value || '')}
          placeholder="Select Vehicle"
          classNamePrefix="react-select"
          menuPlacement="auto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
            menu: base => ({ ...base, pointerEvents: 'auto' }),
          }}
          menuShouldBlockScroll={false}
          closeMenuOnScroll={false}
          tabSelectsValue={false}
          openMenuOnFocus={true}
          blurInputOnSelect={true}
        />
      );
    }
    if (field.name === 'route_id') {
      const routeOptions = routes.map(r => ({
        value: r.id,
        label: r.route_name,
      }));
      return (
        <Select
          options={routeOptions}
          value={routeOptions.find(opt => opt.value === value) || null}
          onChange={(option: any) => onChange(option?.value || null)}
          placeholder="Select Route (optional)"
          classNamePrefix="react-select"
          menuPlacement="auto"
          isClearable={true}
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
            menu: base => ({ ...base, pointerEvents: 'auto' }),
          }}
          menuShouldBlockScroll={false}
          closeMenuOnScroll={false}
          tabSelectsValue={false}
          openMenuOnFocus={true}
          blurInputOnSelect={true}
        />
      );
    }
    if (field.name === 'billing_cycle') {
      return (
        <Select
          options={BILLING_CYCLE_OPTIONS}
          value={BILLING_CYCLE_OPTIONS.find(opt => opt.value === value) || null}
          onChange={(option: any) => onChange(option?.value || '')}
          placeholder="Select Billing Cycle"
          classNamePrefix="react-select"
          menuPlacement="auto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
            menu: base => ({ ...base, pointerEvents: 'auto' }),
          }}
          menuShouldBlockScroll={false}
          closeMenuOnScroll={false}
          tabSelectsValue={false}
          openMenuOnFocus={true}
          blurInputOnSelect={true}
        />
      );
    }
    return null;
  };

  return (
    <PermissionGuard
      resource="transport_pricing"
      action="list"
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view transport pricing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <MasterPage<TransportPricing, TransportPricingInput>
        config={{
          title: 'Transport Pricing',
          columns,
          defaultValues,
          formFields,
          isLoading,
          data: pricings,
          onCreate: (data) => createMutation.mutate(data),
          onUpdate: (id, data) => updateMutation.mutate({ id: id.toString(), pricing: data }),
          onDelete: (id) => deleteMutation.mutate(id.toString()),
          isCreatePending: createMutation.isPending,
          resetForm: () => {},
          permissions: {
            resource: 'TRANSPORT_PRICING',
            create: true,
            read: true,
            update: true,
            delete: true,
            list: true,
            export: true,
          },
          renderCustomField,
        }}
      />
    </PermissionGuard>
  );
}
