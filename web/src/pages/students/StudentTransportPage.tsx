import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bus, MapPin, Clock, IndianRupee, Navigation2, Truck } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useParentChildren } from '@/api/auth';
import { useStudentTransportsByStudent } from '@/api/hooks/masters/studentTransport';
import type { StudentTransportOut } from '@/types/masters/studentTransport';

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

  // Staff/Admin/Teacher — transport management is in the Transport module
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Full student transport management is available in the Transport section.
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentTransportPage;

// ─── Student own transport view ───────────────────────────────────────────────

function StudentOwnView({ studentId }: { studentId: string }) {
  const { data: transports = [], isLoading } = useStudentTransportsByStudent(studentId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">My Transport</h1>
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
      <h1 className="text-2xl font-bold">Children's Transport</h1>

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

// ─── Shared transport record list ─────────────────────────────────────────────

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
              <Badge variant={t.is_active ? 'default' : 'secondary'}>
                {t.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {/* Route */}
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

              {/* Departure / Arrival */}
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

              {/* Vehicle */}
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

              {/* Pickup Stop */}
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

              {/* Pickup Time */}
              {t.stop?.reaching_time && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pickup Time</p>
                    <p className="font-medium">{t.stop.reaching_time.substring(0, 5)}</p>
                  </div>
                </div>
              )}

              {/* Fee per term */}
              <div className="flex items-start gap-2">
                <IndianRupee className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Fee per Term</p>
                  <p className="font-medium">₹{t.fee_per_term.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
