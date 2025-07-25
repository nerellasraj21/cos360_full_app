import React, { useMemo } from 'react';
import { MasterPage } from '../masters/common/MasterPage';
import type { FormField } from '../masters/common/MasterPage';
import { useRouteStops, useCreateRouteStop, useUpdateRouteStop, useDeleteRouteStop } from '@/api/hooks/masters/routeStops';
import { useRoutes } from '@/api/hooks/masters/routes';
import type { RouteStop, RouteStopInput } from '@/types/masters/routeStop';

const formFields: FormField[] = [
  { name: 'route_id', label: 'Route', type: 'academic_year_select', required: true },
  { name: 'name', label: 'Stop Name', type: 'text', required: true },
  { name: 'number', label: 'Stop Number', type: 'number', required: true },
  { name: 'reaching_time', label: 'Reaching Time', type: 'text', required: true },
  { name: 'fees', label: 'Fees', type: 'number', required: true },
  { name: 'is_active', label: 'Is Active', type: 'checkbox' },
];

const defaultValues: RouteStopInput = {
  route_id: 0,
  name: '',
  number: 0,
  reaching_time: '',
  fees: 0,
  is_active: true,
};

export default function RouteStopsPage() {
  const { data: routeStops = [], isLoading } = useRouteStops();
  const { data: routes = [] } = useRoutes();
  const createMutation = useCreateRouteStop();
  const updateMutation = useUpdateRouteStop();
  const deleteMutation = useDeleteRouteStop();


  const columns = useMemo(() => [
    { key: 'id', label: 'ID' },
    {
      key: 'route_id',
      label: 'Route',
      editable: true,
      render: (_value: any, row: RouteStop) =>
        routes.find(r => r.id === row.route_id)?.route_name || row.route_id,
      renderEdit: (value: any, _row: RouteStop, onChange: (val: any) => void) => (
        <select
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Select Route</option>
          {routes.map(route => (
            <option key={route.id} value={route.id}>{route.route_name}</option>
          ))}
        </select>
      ),
    },
    { key: 'name', label: 'Stop Name', editable: true },
    { key: 'number', label: 'Stop Number', editable: true },
    { key: 'reaching_time', label: 'Reaching Time', editable: true },
    { key: 'fees', label: 'Fees', editable: true },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (_value: any, row: RouteStop) => row.is_active ? 'Yes' : 'No',
      renderEdit: (value: any, _row: RouteStop, onChange: (val: any) => void) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4"
        />
      ),
    },
  ], [routes]);

  const renderCustomField = (field: FormField, value: any, onChange: (val: any) => void) => {
    if (field.name === 'route_id') {
      return (
        <select
          id="route_id"
          name="route_id"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          required={field.required}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Select Route</option>
          {routes.map(route => (
            <option key={route.id} value={route.id}>{route.route_name}</option>
          ))}
        </select>
      );
    }
    return null;
  };

  return (
    <MasterPage<RouteStop, RouteStopInput>
      config={{
        title: 'Route Stops',
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: routeStops,
        onCreate: (data) => createMutation.mutate(data),
        onUpdate: (id, data) => updateMutation.mutate({ id, routeStop: data }),
        onDelete: (id) => deleteMutation.mutate(id),
        isCreatePending: createMutation.isPending,
        resetForm: () => { },
        renderCustomField,
      }}
    />
  );
} 