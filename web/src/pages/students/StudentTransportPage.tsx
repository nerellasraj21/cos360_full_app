import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2, Bus, MapPin, Clock, IndianRupee, Navigation2, Truck,
  Plus, Filter, Search, Edit, Trash2, Tag,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useParentChildren } from '@/api/auth';
import {
  useStudentTransports,
  useStudentTransportsByStudent,
  useCreateStudentTransport,
  useUpdateStudentTransport,
  useDeleteStudentTransport,
} from '@/api/hooks/masters/studentTransport';
import { useStudentsDropdownSimple } from '@/api/hooks/students/admissions';
import { useTrips } from '@/api/hooks/masters/trips';
import { useRouteStops } from '@/api/hooks/masters/routeStops';
import { useTransportPricingDropdown } from '@/api/hooks/masters/transportPricing';
import type { StudentTransportOut, StudentTransportCreate, StudentTransportUpdate } from '@/types/masters/studentTransport';
import type { TripOut, TripListResponse } from '@/types/masters/trip';
import { PageHeader } from '@/components/ui/PageHeader';

// ─── Role router ─────────────────────────────────────────────────────────────

const StudentTransportPage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const entityId = useAuthStore((s) => s.entityId);

  const roleName = role?.name.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <StudentOwnView studentId={studentId ?? ''} />;
  }

  if (roleName === 'parent') {
    return <ParentView parentEntityId={entityId} />;
  }

  // Staff / Admin / Teacher — show management table
  return <AdminView />;
};

export default StudentTransportPage;

// ─── Admin management view ────────────────────────────────────────────────────

function AdminView() {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<StudentTransportOut | null>(null);

  const { data: transports = [], isLoading } = useStudentTransports();
  const deleteMutation = useDeleteStudentTransport();

  const filtered = transports.filter((t) => {
    const studentName = t.student
      ? `${t.student.first_name} ${t.student.last_name}`.toLowerCase()
      : '';
    const route = (t.trip?.route?.route_name ?? '').toLowerCase();
    const stop = (t.stop?.name ?? '').toLowerCase();
    const q = search.toLowerCase();
    return !q || studentName.includes(q) || route.includes(q) || stop.includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="Student Transport" icon={<Bus className="h-5 w-5" />} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Transport Assignments</CardTitle>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Transport
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            <div className="relative ml-2">
              <Search className="h-4 w-4 absolute left-2 top-2 text-muted-foreground" />
              <Input
                placeholder="Search student, route, stop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-64"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No.</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Stop</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Fee / Term</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No transport assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t, idx) => (
                  <TableRow key={t.id} style={{ height: '48px' }}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {t.student
                        ? `${t.student.first_name} ${t.student.last_name}`
                        : <span className="text-muted-foreground text-xs">{t.student_id}</span>}
                    </TableCell>
                    <TableCell>
                      {t.trip ? `Trip #${t.trip.trip_number}` : '—'}
                    </TableCell>
                    <TableCell>
                      {t.trip?.route ? (
                        <div>
                          <p>{t.trip.route.route_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.trip.route.starting_stop} → {t.trip.route.ending_stop}
                          </p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {t.stop ? `${t.stop.name} (#${t.stop.number})` : '—'}
                    </TableCell>
                    <TableCell>
                      {t.pricing ? (
                        <div>
                          <p className="text-sm">{t.pricing.cycle_name}</p>
                          <p className="text-xs text-muted-foreground">₹{Number(t.pricing.amount).toLocaleString()}</p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>₹{Number(t.fee_per_term).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditingTransport(t)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignTransportDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      {editingTransport && (
        <AssignTransportDialog
          open={!!editingTransport}
          onOpenChange={(open) => { if (!open) setEditingTransport(null); }}
          transport={editingTransport}
        />
      )}
    </div>
  );
}

// ─── Assign / Edit transport dialog ──────────────────────────────────────────

interface AssignTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport?: StudentTransportOut;
}

function AssignTransportDialog({ open, onOpenChange, transport }: AssignTransportDialogProps) {
  const isEdit = !!transport;
  const createMutation = useCreateStudentTransport();
  const updateMutation = useUpdateStudentTransport();

  const { data: students = [] } = useStudentsDropdownSimple();
  const tripsQuery = useTrips();
  const trips: TripOut[] = Array.isArray(tripsQuery.data)
    ? (tripsQuery.data as TripOut[])
    : ((tripsQuery.data as TripListResponse)?.items ?? []);
  const { data: stops = [] } = useRouteStops(false);

  const [studentId, setStudentId] = useState('');
  const [tripId, setTripId] = useState('');
  const [stopId, setStopId] = useState('');
  const [feePerTerm, setFeePerTerm] = useState('');
  const [pricingId, setPricingId] = useState('');

  // Derive vehicleId from selected trip for pricing dropdown
  const selectedTrip = trips.find(t => t.id === tripId);
  const vehicleId = selectedTrip?.vehicle_id;
  const { data: pricingOptions = [] } = useTransportPricingDropdown(vehicleId);

  useEffect(() => {
    if (open) {
      setStudentId(transport?.student_id ?? '');
      setTripId(transport?.trip_id ?? '');
      setStopId(transport?.stop_id ?? '');
      setFeePerTerm(transport?.fee_per_term?.toString() ?? '');
      setPricingId(transport?.pricing_id ?? '');
    }
  }, [open, transport]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = tripId && stopId && feePerTerm && (isEdit || studentId);

  const handleSubmit = () => {
    const fee = parseFloat(feePerTerm);
    if (!canSubmit || isNaN(fee) || fee <= 0) return;

    if (isEdit && transport) {
      const updateData: StudentTransportUpdate = {};
      if (tripId !== transport.trip_id) updateData.trip_id = tripId;
      if (stopId !== transport.stop_id) updateData.stop_id = stopId;
      if (fee !== transport.fee_per_term) updateData.fee_per_term = fee;
      if ((pricingId || null) !== (transport.pricing_id || null)) updateData.pricing_id = pricingId || null;
      updateMutation.mutate(
        { id: transport.id, transport: updateData },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      const createData: StudentTransportCreate = {
        student_id: studentId,
        trip_id: tripId,
        stop_id: stopId,
        fee_term_id: null,
        fee_per_term: fee,
        pricing_id: pricingId || null,
      };
      createMutation.mutate(createData, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'Assign Transport'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Trip</Label>
            <Select value={tripId} onValueChange={setTripId}>
              <SelectTrigger>
                <SelectValue placeholder="Select trip..." />
              </SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>Trip #{t.trip_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stop</Label>
            <Select value={stopId} onValueChange={setStopId}>
              <SelectTrigger>
                <SelectValue placeholder="Select stop..." />
              </SelectTrigger>
              <SelectContent>
                {stops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>#{s.number} – {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pricingOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Pricing Plan (optional)</Label>
              <Select value={pricingId} onValueChange={(val) => {
                setPricingId(val);
                const selected = pricingOptions.find(p => p.id === val);
                if (selected) setFeePerTerm(selected.amount.toString());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {pricingOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.cycle_name} — ₹{Number(p.amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fee per Term (₹)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={feePerTerm}
              onChange={(e) => setFeePerTerm(e.target.value)}
              placeholder="e.g. 1500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Student own transport view ───────────────────────────────────────────────

function StudentOwnView({ studentId }: { studentId: string }) {
  const { data: transports = [], isLoading } = useStudentTransportsByStudent(studentId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="My Transport" icon={<Bus className="h-5 w-5" />} />
      <TransportList transports={transports} isLoading={isLoading} />
    </div>
  );
}

// ─── Parent child transport view ──────────────────────────────────────────────

function ParentView({ parentEntityId }: { parentEntityId: string | null }) {
  const { data: children = [], isLoading: childrenLoading, error: childrenError } = useParentChildren(parentEntityId);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: transports = [], isLoading: transportLoading } = useStudentTransportsByStudent(selectedChildId);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="Children's Transport" icon={<Bus className="h-5 w-5" />} />

      <Card>
        <CardHeader><CardTitle>Select Child</CardTitle></CardHeader>
        <CardContent>
          {!parentEntityId ? (
            <div className="text-center py-4 text-muted-foreground">
              Session outdated. Please log out and log back in.
            </div>
          ) : childrenLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading children...</span>
            </div>
          ) : childrenError ? (
            <div className="text-center py-4 text-destructive">
              Failed to load children: {(childrenError as Error).message}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No children found for this account.
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name || `${child.first_name} ${child.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedChild && (
        <TransportList
          transports={transports}
          isLoading={transportLoading}
          title={`${selectedChild.name || `${selectedChild.first_name} ${selectedChild.last_name}`.trim()}'s Transport`}
        />
      )}
    </div>
  );
}

// ─── Shared transport record list (student / parent view) ─────────────────────

function TransportList({
  transports,
  isLoading,
  title = 'Transport Assignment',
}: {
  transports: StudentTransportOut[];
  isLoading: boolean;
  title?: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading transport...</span>
        </CardContent>
      </Card>
    );
  }

  if (transports.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No transport assignment found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {transports.map((t) => (
          <div key={t.id} className="border rounded-lg p-4 space-y-3">
            {/* Header: Trip # + status badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Bus className="h-4 w-4 text-muted-foreground" />
                {t.trip ? `Trip #${t.trip.trip_number}` : 'Transport Assignment'}
              </div>
              <StatusBadge status={t.is_active} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {t.trip?.route && (
                <div className="flex items-start gap-2">
                  <Navigation2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Route</p>
                    <p className="font-medium">{t.trip.route.route_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.trip.route.starting_stop} → {t.trip.route.ending_stop}
                    </p>
                  </div>
                </div>
              )}

              {t.trip?.route && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Timings</p>
                    <p className="font-medium">
                      {t.trip.route.start_time.substring(0, 5)} – {t.trip.route.end_time.substring(0, 5)}
                    </p>
                    <p className="text-xs text-muted-foreground">Departure – Arrival</p>
                  </div>
                </div>
              )}

              {t.trip?.vehicle && (
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Vehicle</p>
                    <p className="font-medium">{t.trip.vehicle.registration_number}</p>
                    <p className="text-xs text-muted-foreground">{t.trip.vehicle.vehicle_type}</p>
                  </div>
                </div>
              )}

              {t.stop && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pickup Stop</p>
                    <p className="font-medium">{t.stop.name}</p>
                    <p className="text-xs text-muted-foreground">Stop #{t.stop.number}</p>
                  </div>
                </div>
              )}

              {(t.stop?.pickup_time || t.stop?.reaching_time) && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pickup Time</p>
                    <p className="font-medium">
                      {(t.stop.pickup_time || t.stop.reaching_time)!.substring(0, 5)}
                    </p>
                  </div>
                </div>
              )}

              {t.stop?.drop_time && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Drop Time</p>
                    <p className="font-medium">{t.stop.drop_time.substring(0, 5)}</p>
                  </div>
                </div>
              )}

              {t.pricing && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pricing Plan</p>
                    <p className="font-medium">{t.pricing.cycle_name}</p>
                    <p className="text-xs text-muted-foreground">₹{t.pricing.amount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <IndianRupee className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Fee per Term</p>
                  <p className="font-medium">₹{Number(t.fee_per_term).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
