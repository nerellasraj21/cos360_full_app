import React, { useMemo } from 'react';
import { MasterPage } from '../masters/common/MasterPage';
import type { FormField } from '../masters/common/MasterPage';
import { useRouteStops, useCreateRouteStop, useUpdateRouteStop, useDeleteRouteStop } from '@/api/hooks/masters/routeStops';
import { useRoutes } from '@/api/hooks/masters/routes';
import { PermissionGuard } from '@/components/common';
import type { RouteStop, RouteStopInput } from '@/types/masters/routeStop';
import Select from 'react-select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldX } from 'lucide-react';

const formFields: FormField[] = [
  { name: 'route_id', label: 'Route', required: true },
  { name: 'name', label: 'Stop Name', required: true },
  { name: 'number', label: 'Stop Number', type: 'number', required: true },
  { name: 'reaching_time', label: 'Reaching Time', required: true },
  { name: 'fees', label: 'Fees', type: 'number', required: true },
  { name: 'is_active', label: 'Active', type: 'checkbox' },
];

const defaultValues: RouteStopInput = {
  route_id: '',
  name: '',
  number: 1, // Start with 1 as first stop
  reaching_time: '08:30:00',
  fees: 25, // Integer as per backend
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
      renderEdit: (value: any, _row: RouteStop, onChange: (val: any) => void) => {
        const routeOptions = routes.map(route => ({
          value: route.id,
          label: route.route_name
        }));

        return (
          <Select
            options={routeOptions}
            value={routeOptions.find((opt) => opt.value === value) || null}
            onChange={(option: any) => onChange(option?.value || '')}
            placeholder="Select Route"
            classNamePrefix="react-select"
            menuPlacement="auto"
            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
            styles={{
              menuPortal: base => ({
                ...base,
                zIndex: 9999,
                pointerEvents: 'auto' // Essential for clickability
              }),
              menu: base => ({
                ...base,
                pointerEvents: 'auto' // Essential for clickability
              }),
              control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' })
            }}
            isClearable={false}
            // Keyboard accessibility props
            menuShouldBlockScroll={false}
            closeMenuOnScroll={false}
            tabSelectsValue={false}
            openMenuOnFocus={true}
            blurInputOnSelect={true}
          />
        );
      },
    },
    { key: 'name', label: 'Stop Name', editable: true },
    { key: 'number', label: 'Stop Number', editable: true },
    {
      key: 'reaching_time',
      label: 'Reaching Time',
      editable: true,
      render: (value: string) => value ? value.substring(0, 5) : 'N/A',
      renderEdit: (value: any, _row: RouteStop, onChange: (val: any) => void) => (
        <input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 border border-input rounded text-sm"
          style={{ minHeight: '32px' }}
        />
      )
    },
    {
      key: 'fees',
      label: 'Fees',
      editable: true,
      render: (value: number) => value ? `₹${value}` : 'N/A'
    },
    {
      key: 'is_active',
      label: 'Active',
      editable: true,
      render: (_value: any, row: RouteStop) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      renderEdit: (value: any, _row: RouteStop, onChange: (val: any) => void) => (
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
  ], [routes]);

  const renderCustomField = (field: FormField, value: any, onChange: (val: any) => void) => {
    if (field.name === 'route_id') {
      const routeOptions = routes.map(route => ({
        value: route.id,
        label: route.route_name
      }));

      return (
        <Select
          options={routeOptions}
          value={routeOptions.find((opt) => opt.value === value) || null}
          onChange={(option: any) => onChange(option?.value || '')}
          placeholder="Select Route"
          classNamePrefix="react-select"
          menuPlacement="auto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={{
            menuPortal: base => ({
              ...base,
              zIndex: 9999,
              pointerEvents: 'auto' // Essential for clickability
            }),
            menu: base => ({
              ...base,
              pointerEvents: 'auto' // Essential for clickability
            })
          }}
          // Keyboard accessibility props
          menuShouldBlockScroll={false}
          closeMenuOnScroll={false}
          tabSelectsValue={false}
          openMenuOnFocus={true}
          blurInputOnSelect={true}
        />
      );
    }
    if (field.name === 'reaching_time') {
      return (
        <input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          required={field.required}
        />
      );
    }
    return null;
  };

  return (
    <PermissionGuard
      resource="route_stops"
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
                      You don't have permission to view route stops.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <MasterPage<RouteStop, RouteStopInput>
        config={{
          title: 'Route Stops Management',
          addButtonLabel: 'Add Route Stops Management',
          columns,
          defaultValues,
          formFields,
          isLoading,
          data: routeStops,
          onCreate: (data) => createMutation.mutate(data),
          onUpdate: (id, data) => updateMutation.mutate({ id: id.toString(), routeStop: data }),
          onDelete: (id) => deleteMutation.mutate(id.toString()),
          isCreatePending: createMutation.isPending,
          resetForm: () => { },
          permissions: {
            resource: 'ROUTE_STOPS',
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