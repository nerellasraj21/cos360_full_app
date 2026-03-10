import { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/masters/useVehicles';
import { PermissionGuard } from '@/components/common';
import type { Vehicle, VehicleInput } from '@/types/masters/vehicle';
import Select from 'react-select';
import type { SingleValue } from 'react-select';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldX } from 'lucide-react';

export default function VehiclePage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const { data: vehicles = [], isLoading } = useVehicles();
  const total = vehicles.length;
  const paginatedData = vehicles.slice(page * pageSize, (page + 1) * pageSize);
  const hasMore = (page + 1) * pageSize < total;

  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const columns: TableColumn<Vehicle>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Vehicle Name', editable: true },
    { key: 'registration_number', label: 'Registration Number', editable: true },
    {
      key: 'vehicle_type',
      label: 'Vehicle Type',
      editable: true,
      renderEdit: (value, _row, onChange) => (
        <Select
          options={vehicleTypeOptions}
          value={vehicleTypeOptions.find((opt) => opt.value === value) || null}
          onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
          placeholder="Select Vehicle Type"
          classNamePrefix="react-select"
          menuPlacement="auto"
          styles={{
            menu: (base) => ({ ...base, zIndex: 9999 }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' })
          }}
          isClearable={false}
          openMenuOnClick={true}
          closeMenuOnSelect={true}
          blurInputOnSelect={true}
          autoFocus={false}
          tabSelectsValue={false}
        />
      )
    },
    {
      key: 'last_inspected_date',
      label: 'Last Inspected',
      editable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'pollution_renewal_date',
      label: 'Pollution Renewal',
      editable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (v) => (
        <StatusBadge status={v} />
      ),
      renderEdit: (value, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
      ),
    },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Vehicle Name', required: true },
    { name: 'registration_number', label: 'Registration Number', required: true },
    { name: 'vehicle_type', label: 'Vehicle Type', required: true },
    { name: 'last_inspected_date', label: 'Last Inspected Date', type: 'date', required: true },
    { name: 'pollution_renewal_date', label: 'Pollution Renewal Date', type: 'date', required: true },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ];

  const handlePageChange = (newPage: number) => {
    if (newPage > page && hasMore) setPage(newPage);
    if (newPage < page && page > 0) setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const vehicleTypeOptions = [
    { value: 'Bus', label: 'Bus' },
    { value: 'Van', label: 'Van' },
    { value: 'Auto', label: 'Auto' }
  ];

  const config: MasterPageConfig<Vehicle, VehicleInput> = {
    title: 'Vehicles',
    columns,
    defaultValues: {
      name: '',
      registration_number: '',
      vehicle_type: 'Bus' as const,
      last_inspected_date: new Date().toISOString().split('T')[0], // Today's date
      pollution_renewal_date: new Date().toISOString().split('T')[0], // Today's date
      is_active: true,
    },
    formFields,
    isLoading,
    data: paginatedData,
    onCreate: (data) => createVehicle.mutate(data),
    onUpdate: (id, vehicle) => updateVehicle.mutate({ id: id.toString(), data: vehicle }),
    onDelete: (id) => deleteVehicle.mutate(id.toString()),
    isCreatePending: createVehicle.status === 'pending',
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    permissions: {
      resource: 'VEHICLES',
      create: true,
      read: true,
      update: true,
      delete: true,
      list: true,
      export: true,
    },
    renderCustomField: (field, value, onChange) => {
      if (field.name === 'vehicle_type') {
        return (
          <Select
            options={vehicleTypeOptions}
            value={vehicleTypeOptions.find((opt) => opt.value === value) || null}
            onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
            placeholder="Select Vehicle Type"
            classNamePrefix="react-select"
            menuPlacement="auto"
            styles={{
              menu: (base) => ({ ...base, zIndex: 9999 }),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            }}
            openMenuOnClick={true}
            closeMenuOnSelect={true}
            blurInputOnSelect={true}
            autoFocus={false}
            tabSelectsValue={false}
          />
        );
      }
      return null;
    },
  };

  return (
    <PermissionGuard
      resource="vehicles"
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
                      You don't have permission to view vehicles.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <MasterPage config={config} />
    </PermissionGuard>
  );
}