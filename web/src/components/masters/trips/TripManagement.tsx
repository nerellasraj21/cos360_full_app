import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { tripsApi, driversApi } from '@/api/masters/trips';
import { fetchVehicles } from '@/api/masters/vehicles';
import { fetchRoutes } from '@/api/masters/routes';
import { VehiclesDropdown } from '@/components/dropdown-system/components/VehiclesDropdown';
import { TransportRoutesDropdown } from '@/components/dropdown-system/components/TransportRoutesDropdown';
import type { TripOut, TripCreate, Driver } from '@/types/masters/trip';
import type { Vehicle } from '@/types/masters/vehicle';
import type { Route } from '@/types/masters/route';

interface TripManagementProps {
  className?: string;
}

export function TripManagement({ className }: TripManagementProps) {
  const [trips, setTrips] = useState<TripOut[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripOut | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<TripOut | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    vehicle_id: '',
    route_id: '',
    driver_id: '',
    trip_number: 0,
  });

  // Load trips, drivers, vehicles, and routes on component mount
  useEffect(() => {
    loadTrips();
    loadDrivers();
    loadVehicles();
    loadRoutes();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getAllTrips();
      const tripsList = Array.isArray(response) ? response : [];
      setTrips(Array.isArray(tripsList) ? tripsList : []);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load trips');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setDriversLoading(true);
      const response = await driversApi.getAllDrivers();
      const driversList = response.items || response || [];
      setDrivers(Array.isArray(driversList) ? driversList : []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers');
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const vehiclesList = await fetchVehicles(false);
      setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
      setVehicles([]);
    }
  };

  const loadRoutes = async () => {
    try {
      const routesList = await fetchRoutes(false);
      setRoutes(Array.isArray(routesList) ? routesList : []);
    } catch (error) {
      console.error('Error loading routes:', error);
      toast.error('Failed to load routes');
      setRoutes([]);
    }
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.user_id === driverId);
    return driver?.full_name || 'Unknown Driver';
  };

  const getVehicleType = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.vehicle_type || 'Unknown';
  };

  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route?.route_name || 'Unknown Route';
  };

  const formatTripDate = (trip: TripOut) => {
    const dateString = trip.created_at || trip.updated_at;
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Error';
    }
  };

  // Filter trips based on search term
  const filteredTrips = trips.filter(trip =>
    trip.trip_number.toString().includes(searchTerm.toLowerCase()) ||
    getDriverName(trip.driver_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRouteName(trip.route_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getVehicleType(trip.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0 inline" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0 inline" />;
  };

  const sortedTrips = useMemo(() => {
    const data = [...filteredTrips];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'trip_number': aVal = String(a.trip_number); bVal = String(b.trip_number); break;
        case 'driver': aVal = getDriverName(a.driver_id); bVal = getDriverName(b.driver_id); break;
        case 'vehicle': aVal = getVehicleType(a.vehicle_id); bVal = getVehicleType(b.vehicle_id); break;
        case 'route': aVal = getRouteName(a.route_id); bVal = getRouteName(b.route_id); break;
        case 'created_at': aVal = a.created_at || ''; bVal = b.created_at || ''; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTrips, sortKey, sortDir]);

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      route_id: '',
      driver_id: '',
      trip_number: 0,
    });
  };

  const handleCreateTrip = async () => {
    try {
      if (!formData.vehicle_id || !formData.route_id || !formData.driver_id || formData.trip_number <= 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      const tripData: TripCreate = {
        vehicle_id: formData.vehicle_id,
        route_id: formData.route_id,
        driver_id: formData.driver_id,
        trip_number: formData.trip_number,
      };

      const createdTrip = await tripsApi.createTrip(tripData);
      console.log('Trip created:', createdTrip);
      toast.success('Trip created successfully');
      setIsDirty(false);
      setShowCreateDialog(false);
      resetForm();
      await loadTrips();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error(error.message || 'Failed to create trip');
    }
  };

  const handleUpdateTrip = async () => {
    if (!editingTrip) return;

    try {
      if (!formData.vehicle_id || !formData.route_id || !formData.driver_id || formData.trip_number <= 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      const tripData: TripCreate = {
        vehicle_id: formData.vehicle_id,
        route_id: formData.route_id,
        driver_id: formData.driver_id,
        trip_number: formData.trip_number,
      };

      await tripsApi.updateTrip(editingTrip.id, tripData);
      toast.success('Trip updated successfully');
      setIsDirty(false);
      setEditingTrip(null);
      resetForm();
      loadTrips();
    } catch (error: any) {
      console.error('Error updating trip:', error);
      toast.error(error.message || 'Failed to update trip');
    }
  };

  const handleDeleteTrip = async (trip: TripOut) => {
    try {
      await tripsApi.deleteTrip(trip.id);
      toast.success('Trip deleted successfully');
      loadTrips();
      setDeletingTrip(null);
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast.error(error.message || 'Failed to delete trip');
    }
  };

  const handleEditTrip = (trip: TripOut) => {
    setFormData({
      vehicle_id: trip.vehicle_id,
      route_id: trip.route_id,
      driver_id: trip.driver_id,
      trip_number: trip.trip_number,
    });
    setIsDirty(false);
    setEditingTrip(trip);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Trip Management</CardTitle>
            <Dialog
              open={showCreateDialog}
              onOpenChange={(open) => { if (open) setIsDirty(false); setShowCreateDialog(open); }}
              guardDirty={isDirty}
              onDirtyDiscard={() => setIsDirty(false)}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Trip</DialogTitle>
                </DialogHeader>
                <div className="space-y-4" onChange={() => setIsDirty(true)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Vehicle *</Label>
                      <VehiclesDropdown
                        value={formData.vehicle_id}
                        onChange={(value) => { setFormData(prev => ({ ...prev, vehicle_id: String(value) })); setIsDirty(true); }}
                        placeholder="Select vehicle..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="route">Route *</Label>
                      <TransportRoutesDropdown
                        value={formData.route_id}
                        onChange={(value) => { setFormData(prev => ({ ...prev, route_id: String(value) })); setIsDirty(true); }}
                        placeholder="Select route..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver">Driver *</Label>
                      <Select
                        value={formData.driver_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value }))}
                        disabled={driversLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={driversLoading ? "Loading drivers..." : "Select driver..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              {driversLoading ? 'Loading drivers...' : 'No drivers available'}
                            </div>
                          ) : (
                            drivers.map((driver) => (
                              <SelectItem key={driver.user_id} value={driver.user_id}>
                                {driver.full_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {!driversLoading && drivers.length === 0 && (
                        <p className="text-xs text-destructive">No drivers found. Please add drivers first.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tripNumber">Trip Number *</Label>
                      <Input
                        id="tripNumber"
                        type="number"
                        value={formData.trip_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, trip_number: parseInt(e.target.value) || 0 }))}
                        placeholder="Enter trip number"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => resetForm()}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreateTrip}>Create Trip</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by trip number, driver, route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {searchTerm && (
                <span className="text-xs text-muted-foreground">
                  {sortedTrips.length} of {trips.length} results
                </span>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort('trip_number')}
                >
                  <div className="flex items-center">Trip Number<SortIcon col="trip_number" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort('driver')}
                >
                  <div className="flex items-center">Driver<SortIcon col="driver" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort('vehicle')}
                >
                  <div className="flex items-center">Vehicle<SortIcon col="vehicle" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort('route')}
                >
                  <div className="flex items-center">Route<SortIcon col="route" /></div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/80"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">Created At<SortIcon col="created_at" /></div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading trips...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No trips found
                  </TableCell>
                </TableRow>
              ) : (
                sortedTrips.map((trip, index) => (
                  <TableRow key={trip.id} style={{ height: '48px' }}>
                    <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline">#{trip.trip_number}</Badge>
                    </TableCell>
                    <TableCell>{getDriverName(trip.driver_id)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getVehicleType(trip.vehicle_id)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getRouteName(trip.route_id)}</Badge>
                    </TableCell>
                    <TableCell>{formatTripDate(trip)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTrip(trip)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingTrip(trip)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete trip #{trip.trip_number}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTrip(trip)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTrip && (
        <Dialog
          open={!!editingTrip}
          onOpenChange={() => { setEditingTrip(null); resetForm(); }}
          guardDirty={isDirty}
          onDirtyDiscard={() => setIsDirty(false)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Trip #{editingTrip.trip_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" onChange={() => setIsDirty(true)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle">Vehicle *</Label>
                  <VehiclesDropdown
                    value={formData.vehicle_id}
                    onChange={(value) => { setFormData(prev => ({ ...prev, vehicle_id: String(value) })); setIsDirty(true); }}
                    placeholder="Select vehicle..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-route">Route *</Label>
                  <TransportRoutesDropdown
                    value={formData.route_id}
                    onChange={(value) => { setFormData(prev => ({ ...prev, route_id: String(value) })); setIsDirty(true); }}
                    placeholder="Select route..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-driver">Driver *</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value }))}
                    disabled={driversLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={driversLoading ? "Loading drivers..." : "Select driver..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.user_id} value={driver.user_id}>
                          {driver.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tripNumber">Trip Number *</Label>
                  <Input
                    id="edit-tripNumber"
                    type="number"
                    value={formData.trip_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, trip_number: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter trip number"
                    min="1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => resetForm()}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleUpdateTrip}>Update Trip</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
