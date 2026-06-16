import { useState, useEffect } from 'react';
import { MasterPage, type MasterPageConfig, type FormField } from '@/pages/masters/common/MasterPage';
import type { TableColumn } from '@/components/common/table';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/masters/useVehicles';
import { useTrips, useCreateTrip, useDeleteTrip, useTripsByVehicle } from '@/api/hooks/masters/trips';
import { useRoutes } from '@/api/hooks/masters/routes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '@/api/masters/staff';
import { PermissionGuard } from '@/components/common';
import type { Vehicle, VehicleInput } from '@/types/masters/vehicle';
import type { TripOut } from '@/types/masters/trip';
import Select from 'react-select';
import type { SingleValue } from 'react-select';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldX, Plus, Trash2, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TripRow {
  _key: number;
  id?: string;       // set for trips already in DB, undefined for newly added rows
  route_id: string;
  driver_id: string;
}

const defaultForm = {
  name: '',
  registration_number: '',
  vehicle_type: 'Bus' as 'Bus' | 'Van' | 'Auto',
  driver_name: '',
  co_driver_name: '',
  driving_licence_no: '',
  driving_licence_exp_date: '',
  bus_insurance_vendor: '',
  insurance_expiry_date: '',
  number_of_trips: '' as string | number,
  is_ac: false,
  is_active: true,
};

const selectStyles = {
  menuPortal: (base: any) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' as const }),
  menu: (base: any) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' as const }),
  control: (base: any) => ({ ...base, minHeight: '36px', fontSize: '14px' }),
};

// ── Vehicle Add Dialog ────────────────────────────────────────────────────────
function VehicleAddDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [counter, setCounter] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: routes = [] } = useRoutes(false);
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const createTrip = useCreateTrip();

  // Direct query — no permission gate so drivers always load
  const { data: staffRaw } = useQuery({
    queryKey: ['staff', 'all-for-vehicles'],
    queryFn: () => staffApi.getAllStaffEnrollments({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: designationsRaw } = useQuery({
    queryKey: ['designations', 'dropdown-for-vehicles'],
    queryFn: () => staffApi.getDesignationsDropdown(),
    staleTime: 10 * 60 * 1000,
  });

  const allStaff: any[] = (staffRaw as any)?.items ?? (Array.isArray(staffRaw) ? staffRaw : []);
  const allDesignations: any[] = (designationsRaw as any)?.items ?? (Array.isArray(designationsRaw) ? designationsRaw : []);

  // Find the "Driver" designation ID
  const driverDesignation = allDesignations.find(
    d => d.title?.toLowerCase() === 'driver' || d.name?.toLowerCase() === 'driver'
  );

  // Filter to only staff with Driver designation
  const driverStaff = driverDesignation
    ? allStaff.filter(s => s.designation_id === driverDesignation.id)
    : allStaff;

  const routeOptions = (routes as any[]).map(r => ({
    value: r.id,
    label: r.route_name + (r.starting_stop && r.ending_stop ? ` (${r.starting_stop} → ${r.ending_stop})` : ''),
  }));

  const driverOptions = driverStaff.map(d => ({
    value: d.id,
    label: [d.first_name, d.last_name].filter(Boolean).join(' '),
  }));

  const vehicleTypeOptions = [
    { value: 'Bus', label: 'Bus' },
    { value: 'Van', label: 'Van' },
    { value: 'Auto', label: 'Auto' },
  ];

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addTrip = () => {
    const key = counter + 1;
    setCounter(key);
    setTrips(prev => [...prev, { _key: key, route_id: '', driver_id: '' }]);
  };

  const removeTrip = (key: number) => setTrips(prev => prev.filter(t => t._key !== key));

  const updateTrip = (key: number, patch: Partial<TripRow>) =>
    setTrips(prev => prev.map(t => t._key === key ? { ...t, ...patch } : t));

  const resetAndClose = () => {
    setForm({ ...defaultForm });
    setTrips([]);
    setCounter(0);
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.registration_number.trim()) {
      toast.error('Vehicle Name and Registration Number are required');
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      // Step 1: create with core fields only (backend rejects extended fields on POST)
      const newVehicle = await createVehicle.mutateAsync({
        name: form.name,
        registration_number: form.registration_number,
        vehicle_type: form.vehicle_type,
        is_active: form.is_active,
        last_inspected_date: today,
        pollution_renewal_date: today,
      });

      // Step 2: patch with extended fields so they are persisted
      const hasExtended = form.driver_name || form.co_driver_name || form.driving_licence_no ||
        form.driving_licence_exp_date || form.bus_insurance_vendor || form.insurance_expiry_date ||
        form.number_of_trips !== '';
      if (hasExtended || form.is_ac) {
        await updateVehicle.mutateAsync({
          id: newVehicle.id,
          data: {
            name: form.name,
            registration_number: form.registration_number,
            vehicle_type: form.vehicle_type,
            is_active: form.is_active,
            last_inspected_date: today,
            pollution_renewal_date: today,
            driver_name: form.driver_name || null,
            co_driver_name: form.co_driver_name || null,
            driving_licence_no: form.driving_licence_no || null,
            driving_licence_exp_date: form.driving_licence_exp_date || null,
            bus_insurance_vendor: form.bus_insurance_vendor || null,
            insurance_expiry_date: form.insurance_expiry_date || null,
            number_of_trips: form.number_of_trips === '' ? null : Number(form.number_of_trips),
            is_ac: form.is_ac,
          },
        });
      }

      const validTrips = trips.filter(t => t.route_id && t.driver_id);
      for (let i = 0; i < validTrips.length; i++) {
        await createTrip.mutateAsync({
          vehicle_id: newVehicle.id,
          route_id: validTrips[i].route_id,
          driver_id: validTrips[i].driver_id,
          trip_number: i + 1,
        });
      }
      resetAndClose();
    } catch {
      // errors handled by mutation hooks
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Add Vehicle
      </Button>

      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />}

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 z-50">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            {/* Vehicle Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Vehicle Name <span className="text-red-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Bus 01"
                />
              </div>
              <div className="space-y-1">
                <Label>Registration Number <span className="text-red-500">*</span></Label>
                <Input
                  value={form.registration_number}
                  onChange={e => setField('registration_number', e.target.value)}
                  placeholder="KA01AB1234"
                />
              </div>
              <div className="space-y-1">
                <Label>Vehicle Type</Label>
                <Select
                  options={vehicleTypeOptions}
                  value={vehicleTypeOptions.find(o => o.value === form.vehicle_type) || null}
                  onChange={opt => setField('vehicle_type', opt?.value || 'Bus')}
                  styles={selectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  classNamePrefix="react-select"
                />
              </div>
              <div className="space-y-1">
                <Label>Driving Licence No.</Label>
                <Input
                  value={form.driving_licence_no}
                  onChange={e => setField('driving_licence_no', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Driver Name</Label>
                <Select
                  options={driverOptions}
                  value={driverOptions.find(o => o.label === form.driver_name) || null}
                  onChange={opt => setField('driver_name', opt?.label || '')}
                  placeholder="Select driver..."
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  classNamePrefix="react-select"
                />
              </div>
              <div className="space-y-1">
                <Label>Co-Driver Name</Label>
                <Input
                  value={form.co_driver_name}
                  onChange={e => setField('co_driver_name', e.target.value)}
                  placeholder="Enter co-driver name"
                />
              </div>
              <div className="space-y-1">
                <Label>Driving Licence Expiry Date</Label>
                <Input
                  type="date"
                  value={form.driving_licence_exp_date}
                  onChange={e => setField('driving_licence_exp_date', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Bus Insurance Vendor</Label>
                <Input
                  value={form.bus_insurance_vendor}
                  onChange={e => setField('bus_insurance_vendor', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Number of Trips</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.number_of_trips}
                  onChange={e => setField('number_of_trips', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1 col-span-2 max-w-xs">
                <Label>Insurance Expiry Date</Label>
                <Input
                  type="date"
                  value={form.insurance_expiry_date}
                  onChange={e => setField('insurance_expiry_date', e.target.value)}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_ac}
                  onChange={e => setField('is_ac', e.target.checked)}
                  className="w-4 h-4"
                />
                AC Bus
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setField('is_active', e.target.checked)}
                  className="w-4 h-4"
                />
                Active
              </label>
            </div>

            {/* Trips Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Trips</span>
                <Button type="button" size="sm" variant="outline" onClick={addTrip}>
                  <Plus className="h-3 w-3 mr-1" /> Add Trip
                </Button>
              </div>

              {trips.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No trips added. Click "Add Trip" to assign routes to this vehicle.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-1 w-14">#</th>
                      <th className="pb-1 pr-2">Route</th>
                      <th className="pb-1 pr-2">Driver</th>
                      <th className="pb-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip, idx) => (
                      <tr key={trip._key} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Trip {idx + 1}
                        </td>
                        <td className="py-1 pr-2">
                          <Select
                            options={routeOptions}
                            value={routeOptions.find(o => o.value === trip.route_id) || null}
                            onChange={opt => updateTrip(trip._key, { route_id: opt?.value || '' })}
                            placeholder="Select route..."
                            styles={selectStyles}
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            classNamePrefix="react-select"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Select
                            options={driverOptions}
                            value={driverOptions.find(o => o.value === trip.driver_id) || null}
                            onChange={opt => updateTrip(trip._key, { driver_id: opt?.value || '' })}
                            placeholder="Select driver..."
                            styles={selectStyles}
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            classNamePrefix="react-select"
                          />
                        </td>
                        <td className="py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTrip(trip._key)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={resetAndClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Vehicle Edit Dialog ───────────────────────────────────────────────────────
function VehicleEditDialog({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [counter, setCounter] = useState(0);
  const [originalTripIds, setOriginalTripIds] = useState<Set<string>>(new Set());
  const [tripsInitialized, setTripsInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: existingTripsRaw = [], isLoading: tripsLoading } = useTripsByVehicle(open ? vehicle.id : '');
  const existingTrips = existingTripsRaw.filter(t => t.vehicle_id === vehicle.id);
  const { data: routes = [] } = useRoutes(false);

  const { data: staffRaw } = useQuery({
    queryKey: ['staff', 'all-for-vehicles'],
    queryFn: () => staffApi.getAllStaffEnrollments({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: designationsRaw } = useQuery({
    queryKey: ['designations', 'dropdown-for-vehicles'],
    queryFn: () => staffApi.getDesignationsDropdown(),
    staleTime: 10 * 60 * 1000,
  });

  const allStaff: any[] = (staffRaw as any)?.items ?? (Array.isArray(staffRaw) ? staffRaw : []);
  const allDesignations: any[] = (designationsRaw as any)?.items ?? (Array.isArray(designationsRaw) ? designationsRaw : []);
  const driverDesignation = allDesignations.find(
    d => d.title?.toLowerCase() === 'driver' || d.name?.toLowerCase() === 'driver'
  );
  const driverStaff = driverDesignation
    ? allStaff.filter(s => s.designation_id === driverDesignation.id)
    : allStaff;
  const driverOptions = driverStaff.map(d => ({
    value: d.id,
    label: [d.first_name, d.last_name].filter(Boolean).join(' '),
  }));
  const routeOptions = (routes as any[]).map(r => ({
    value: r.id,
    label: r.route_name + (r.starting_stop && r.ending_stop ? ` (${r.starting_stop} → ${r.ending_stop})` : ''),
  }));
  const vehicleTypeOptions = [
    { value: 'Bus', label: 'Bus' },
    { value: 'Van', label: 'Van' },
    { value: 'Auto', label: 'Auto' },
  ];

  const queryClient = useQueryClient();
  const updateVehicleMutation = useUpdateVehicle();
  const createTripMutation = useCreateTrip();
  const deleteTripMutation = useDeleteTrip();

  // Populate trips state once the query resolves after dialog opens
  useEffect(() => {
    if (open && !tripsLoading && !tripsInitialized) {
      const sorted = [...existingTrips].sort((a, b) => a.trip_number - b.trip_number);
      setTrips(sorted.map((t, i) => ({
        _key: i + 1,
        id: t.id,
        route_id: t.route_id,
        driver_id: (t as any).driver_id ?? '',
      })));
      setOriginalTripIds(new Set(sorted.map(t => t.id)));
      setCounter(sorted.length);
      setTripsInitialized(true);
    }
  }, [open, tripsLoading, tripsInitialized, existingTrips]);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addTrip = () => {
    const key = counter + 1;
    setCounter(key);
    setTrips(prev => [...prev, { _key: key, route_id: '', driver_id: '' }]);
  };
  const removeTrip = (key: number) => setTrips(prev => prev.filter(t => t._key !== key));
  const updateTripRow = (key: number, patch: Partial<TripRow>) =>
    setTrips(prev => prev.map(t => t._key === key ? { ...t, ...patch } : t));

  const handleOpen = () => {
    setForm({
      name: vehicle.name ?? '',
      registration_number: vehicle.registration_number ?? '',
      vehicle_type: vehicle.vehicle_type ?? 'Bus',
      driver_name: vehicle.driver_name ?? '',
      co_driver_name: vehicle.co_driver_name ?? '',
      driving_licence_no: vehicle.driving_licence_no ?? '',
      driving_licence_exp_date: vehicle.driving_licence_exp_date ?? '',
      bus_insurance_vendor: vehicle.bus_insurance_vendor ?? '',
      insurance_expiry_date: vehicle.insurance_expiry_date ?? '',
      number_of_trips: vehicle.number_of_trips ?? '',
      is_ac: vehicle.is_ac ?? false,
      is_active: vehicle.is_active ?? true,
    });
    setTrips([]);
    setCounter(0);
    setOriginalTripIds(new Set());
    setTripsInitialized(false);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.registration_number.trim()) {
      toast.error('Vehicle Name and Registration Number are required');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Save vehicle fields
      await updateVehicleMutation.mutateAsync({
        id: vehicle.id,
        data: {
          name: form.name,
          registration_number: form.registration_number,
          vehicle_type: form.vehicle_type,
          driver_name: form.driver_name || null,
          co_driver_name: form.co_driver_name || null,
          driving_licence_no: form.driving_licence_no || null,
          driving_licence_exp_date: form.driving_licence_exp_date || null,
          bus_insurance_vendor: form.bus_insurance_vendor || null,
          insurance_expiry_date: form.insurance_expiry_date || null,
          number_of_trips: form.number_of_trips === '' ? null : Number(form.number_of_trips),
          is_ac: form.is_ac,
          is_active: form.is_active,
          last_inspected_date: vehicle.last_inspected_date || new Date().toISOString().split('T')[0],
          pollution_renewal_date: vehicle.pollution_renewal_date || new Date().toISOString().split('T')[0],
        },
      });

      // 2. Delete trips that were removed
      const currentTripIds = new Set(trips.filter(t => t.id).map(t => t.id!));
      for (const id of originalTripIds) {
        if (!currentTripIds.has(id)) {
          await deleteTripMutation.mutateAsync(id);
        }
      }

      // 3. Create newly added trips
      const newTrips = trips.filter(t => !t.id && t.route_id && t.driver_id);
      const keptCount = trips.filter(t => !!t.id).length;
      for (let i = 0; i < newTrips.length; i++) {
        await createTripMutation.mutateAsync({
          vehicle_id: vehicle.id,
          route_id: newTrips[i].route_id,
          driver_id: newTrips[i].driver_id,
          trip_number: keptCount + i + 1,
        });
      }

      // Force-refresh the per-vehicle trips cache and vehicle list so counts update
      await queryClient.invalidateQueries({ queryKey: ['trips', 'by-vehicle', vehicle.id] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      setOpen(false);
    } catch {
      // errors handled by mutation hooks
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpen} className="h-7 w-7 p-0">
        <Edit className="h-4 w-4" />
      </Button>

      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />}

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 z-50">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>Edit Vehicle — {vehicle.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Vehicle Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Bus 01" />
              </div>
              <div className="space-y-1">
                <Label>Registration Number <span className="text-red-500">*</span></Label>
                <Input value={form.registration_number} onChange={e => setField('registration_number', e.target.value)} placeholder="KA01AB1234" />
              </div>
              <div className="space-y-1">
                <Label>Vehicle Type</Label>
                <Select
                  options={vehicleTypeOptions}
                  value={vehicleTypeOptions.find(o => o.value === form.vehicle_type) || null}
                  onChange={opt => setField('vehicle_type', opt?.value || 'Bus')}
                  styles={selectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  classNamePrefix="react-select"
                />
              </div>
              <div className="space-y-1">
                <Label>Driving Licence No.</Label>
                <Input value={form.driving_licence_no} onChange={e => setField('driving_licence_no', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Driver Name</Label>
                <Select
                  options={driverOptions}
                  value={driverOptions.find(o => o.label === form.driver_name) || null}
                  onChange={opt => setField('driver_name', opt?.label || '')}
                  placeholder="Select driver..."
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  classNamePrefix="react-select"
                />
              </div>
              <div className="space-y-1">
                <Label>Co-Driver Name</Label>
                <Input value={form.co_driver_name} onChange={e => setField('co_driver_name', e.target.value)} placeholder="Enter co-driver name" />
              </div>
              <div className="space-y-1">
                <Label>Driving Licence Expiry Date</Label>
                <Input type="date" value={form.driving_licence_exp_date} onChange={e => setField('driving_licence_exp_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Bus Insurance Vendor</Label>
                <Input value={form.bus_insurance_vendor} onChange={e => setField('bus_insurance_vendor', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Number of Trips</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.number_of_trips}
                  onChange={e => setField('number_of_trips', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1 col-span-2 max-w-xs">
                <Label>Insurance Expiry Date</Label>
                <Input type="date" value={form.insurance_expiry_date} onChange={e => setField('insurance_expiry_date', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_ac} onChange={e => setField('is_ac', e.target.checked)} className="w-4 h-4" />
                AC Bus
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4" />
                Active
              </label>
            </div>

            {/* Trips Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Trips
                  {tripsLoading && <Loader2 className="inline ml-2 h-3 w-3 animate-spin" />}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={addTrip}>
                  <Plus className="h-3 w-3 mr-1" /> Add Trip
                </Button>
              </div>

              {trips.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {tripsLoading ? 'Loading trips...' : 'No trips assigned. Click "Add Trip" to assign routes.'}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-1 w-14">#</th>
                      <th className="pb-1 pr-2">Route</th>
                      <th className="pb-1 pr-2">Driver</th>
                      <th className="pb-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip, idx) => (
                      <tr key={trip._key} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                          Trip {idx + 1}
                        </td>
                        <td className="py-1 pr-2">
                          <Select
                            options={routeOptions}
                            value={routeOptions.find(o => o.value === trip.route_id) || null}
                            onChange={opt => updateTripRow(trip._key, { route_id: opt?.value || '' })}
                            placeholder="Select route..."
                            styles={selectStyles}
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            classNamePrefix="react-select"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Select
                            options={driverOptions}
                            value={driverOptions.find(o => o.value === trip.driver_id) || null}
                            onChange={opt => updateTripRow(trip._key, { driver_id: opt?.value || '' })}
                            placeholder="Select driver..."
                            styles={selectStyles}
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            classNamePrefix="react-select"
                          />
                        </td>
                        <td className="py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTrip(trip._key)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Vehicle Trips Panel ───────────────────────────────────────────────────────
function VehicleTripsPanel({ vehicles }: { vehicles: Vehicle[] }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Reuse the same all-trips cache (already fetched in VehiclePage, no extra request)
  const { data: allTripsRaw, isLoading: tripsLoading } = useTrips();
  const allTrips: TripOut[] = Array.isArray(allTripsRaw)
    ? allTripsRaw
    : ((allTripsRaw as any)?.items ?? []);
  const { data: routes = [] } = useRoutes(false);

  const vehicleTrips = allTrips
    .filter(t => t.vehicle_id === selectedVehicleId)
    .sort((a, b) => a.trip_number - b.trip_number);

  const routeMap = new Map((routes as any[]).map(r => [r.id, r]));
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const formatTripLabel = (trip: TripOut): string => {
    const route = routeMap.get(trip.route_id) as any;
    if (!route) return `Trip ${trip.trip_number}`;
    const acLabel = selectedVehicle?.is_ac ? 'Bus AC' : 'Bus Non AC';
    return `Trip ${trip.trip_number}  ${route.route_name}  ${acLabel}  (${route.starting_stop ?? 'Starting Point'} → ${route.ending_stop ?? 'Ending Point'})`;
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium shrink-0">Vehicle:</span>
          <ShadSelect value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger className="flex-1 max-w-sm h-9">
              <SelectValue placeholder="Select a vehicle..." />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} ({v.registration_number})
                </SelectItem>
              ))}
            </SelectContent>
          </ShadSelect>
        </div>

        {!selectedVehicleId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a vehicle to view its trips.
          </p>
        )}

        {selectedVehicleId && (
          <>
            {tripsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading trips...</span>
              </div>
            ) : (
            <>
            <p className="text-sm text-muted-foreground mb-3">
              No. of Trips: <strong>{vehicleTrips.length}</strong>
            </p>

            {vehicleTrips.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No trips assigned to this vehicle.</p>
            ) : (
              <div className="space-y-2">
                {vehicleTrips.map(trip => {
                  const label = formatTripLabel(trip);
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
            </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Vehicles Page ─────────────────────────────────────────────────────────────
export default function VehiclePage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const { data: vehicles = [], isLoading } = useVehicles();
  const total = vehicles.length;
  const paginatedData = vehicles.slice(page * pageSize, (page + 1) * pageSize);
  const hasMore = (page + 1) * pageSize < total;

  const deleteVehicle = useDeleteVehicle();

  // Build trip counts from the single all-trips fetch (invalidated by create/delete hooks)
  const { data: allTripsRaw } = useTrips();
  const allTrips: TripOut[] = Array.isArray(allTripsRaw)
    ? allTripsRaw
    : ((allTripsRaw as any)?.items ?? []);
  const tripCountMap = allTrips.reduce((map, t) => {
    if (t.vehicle_id) map.set(t.vehicle_id, (map.get(t.vehicle_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const columns: TableColumn<Vehicle>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Vehicle Name' },
    { key: 'registration_number', label: 'Reg. Number' },
    { key: 'driver_name', label: 'Driver', render: v => v || '—' },
    { key: 'co_driver_name', label: 'Co-Driver', render: v => v || '—' },
    { key: 'driving_licence_no', label: 'Licence No.', render: v => v || '—' },
    {
      key: 'driving_licence_exp_date',
      label: 'Licence Expiry',
      render: v => v ? new Date(v).toLocaleDateString() : '—',
    },
    { key: 'bus_insurance_vendor', label: 'Insurance Vendor', render: v => v || '—' },
    {
      key: 'insurance_expiry_date',
      label: 'Insurance Expiry',
      render: v => v ? new Date(v).toLocaleDateString() : '—',
    },
    {
      key: 'is_ac',
      label: 'AC',
      render: v => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {v ? 'AC' : 'Non AC'}
        </span>
      ),
    },
    {
      key: 'trip_count' as any,
      label: 'Trips',
      render: (_: any, row: Vehicle) => (
        <span className="font-medium">{tripCountMap.get(row.id) ?? 0}</span>
      ),
    },
    { key: 'is_active', label: 'Active', render: v => <StatusBadge status={v} /> },
    {
      key: '_edit' as any,
      label: 'Edit',
      render: (_: any, row: Vehicle) => <VehicleEditDialog vehicle={row} />,
    },
  ];

  const formFields: FormField[] = [];

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
      vehicle_type: 'Bus' as const,
      last_inspected_date: new Date().toISOString().split('T')[0],
      pollution_renewal_date: new Date().toISOString().split('T')[0],
      is_ac: false,
      driver_name: '',
      co_driver_name: '',
      driving_licence_no: '',
      driving_licence_exp_date: '',
      bus_insurance_vendor: '',
      insurance_expiry_date: '',
      is_active: true,
    },
    formFields,
    addModal: <VehicleAddDialog />,
    isLoading,
    data: paginatedData,
    onCreate: () => {},
    onUpdate: () => {},
    onDelete: (id) => deleteVehicle.mutate(id.toString()),
    isCreatePending: false,
    resetForm: () => {},
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    isEditing: false,
    permissions: {
      resource: 'VEHICLES',
      create: true,
      read: true,
      update: false,
      delete: true,
      list: true,
      export: true,
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
      <div className="space-y-6">
        <MasterPage config={config} />
        <VehicleTripsPanel vehicles={vehicles} />
      </div>
    </PermissionGuard>
  );
}
