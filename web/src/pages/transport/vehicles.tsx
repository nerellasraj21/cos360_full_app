import { useState } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useVehiclesPaginated, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/api/hooks/masters/vehicles';
import type { Vehicle, VehicleInput } from '@/types/masters/vehicle';

export default function VehiclePage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const {
    data,
    isLoading,
  } = useVehiclesPaginated(page, pageSize);

  const vehicles = data?.data || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const columns: TableColumn<Vehicle>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', editable: true },
    { key: 'registration_number', label: 'Registration Number', editable: true },
    { key: 'vehicle_type', label: 'Vehicle Type', editable: true },
    { key: 'last_inspected_date', label: 'Last Inspected', editable: true },
    { key: 'pollution_renewal_date', label: 'Pollution Renewal', editable: true },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (v) => v ? 'Yes' : 'No',
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
    { name: 'name', label: 'Name', required: true },
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

  const config: MasterPageConfig<Vehicle, VehicleInput> = {
    title: 'Vehicles',
    columns,
    defaultValues: {
      name: '',
      registration_number: '',
      vehicle_type: '',
      last_inspected_date: '',
      pollution_renewal_date: '',
      is_active: true,
    },
    formFields,
    isLoading,
    data: vehicles,
    onCreate: (data) => createVehicle.mutate(data),
    onUpdate: (id, vehicle) => updateVehicle.mutate({ id, vehicle }),
    onDelete: (id) => deleteVehicle.mutate(id),
    isCreatePending: createVehicle.status === 'pending',
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
  };

  return <MasterPage config={config} />;
} 