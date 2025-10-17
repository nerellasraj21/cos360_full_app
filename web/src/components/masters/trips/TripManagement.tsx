import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { tripsApi, driversApi } from '@/api/masters/trips';
import { VehiclesDropdown } from '@/components/dropdown-system/components/VehiclesDropdown';
import { TransportRoutesDropdown } from '@/components/dropdown-system/components/TransportRoutesDropdown';
import type { TripOut, TripCreate, Driver } from '@/types/masters/trip';

interface TripManagementProps {
  className?: string;
}

export function TripManagement({ className }: TripManagementProps) {
  const [trips, setTrips] = useState<TripOut[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripOut | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<TripOut | null>(null);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    vehicle_id: '',
    route_id: '',
    driver_id: '',
    trip_number: 0,
  });

  // Load trips and drivers on component mount
  useEffect(() => {
    loadTrips();
    loadDrivers();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getAllTrips();
      setTrips(response.items || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      console.error('Failed to load trips');
      // toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setDriversLoading(true);
      const response = await driversApi.getAllDrivers();
      setDrivers(response.items || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setDriversLoading(false);
    }
  };

  // Filter trips based on search term
  const filteredTrips = trips.filter(trip =>
    trip.trip_number.toString().includes(searchTerm.toLowerCase()) ||
    drivers.find(d => d.user_id === trip.driver_id)?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      await tripsApi.createTrip(tripData);
      toast.success('Trip created successfully');
      setShowCreateDialog(false);
      resetForm();
      loadTrips();
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
    setEditingTrip(trip);
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.user_id === driverId);
    return driver?.full_name || 'Unknown Driver';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trip Management</h2>
          <p className="text-muted-foreground">
            Manage transportation trips with vehicle, route, and driver assignments
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle *</Label>
                  <VehiclesDropdown
                    value={formData.vehicle_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
                    placeholder="Select vehicle..."
                  />
                </div>

                {/* Route Selection */}
                <div className="space-y-2">
                  <Label htmlFor="route">Route *</Label>
                  <TransportRoutesDropdown
                    value={formData.route_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, route_id: value }))}
                    placeholder="Select route..."
                  />
                </div>

                {/* Driver Selection */}
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
                      {drivers.map((driver) => (
                        <SelectItem key={driver.user_id} value={driver.user_id}>
                          {driver.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trip Number */}
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
                <Button variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTrip}>
                  Create Trip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by trip number or driver name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trips</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} found
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Number</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading trips...
                  </TableCell>
                </TableRow>
              ) : filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No trips found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <Badge variant="outline">#{trip.trip_number}</Badge>
                    </TableCell>
                    <TableCell>{getDriverName(trip.driver_id)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{trip.vehicle_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{trip.route_id}</Badge>
                    </TableCell>
                    <TableCell>
                      {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTrip(trip)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingTrip(trip)}
                            >
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
        <Dialog open={!!editingTrip} onOpenChange={() => {
          setEditingTrip(null);
          resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Trip #{editingTrip.trip_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle">Vehicle *</Label>
                  <VehiclesDropdown
                    value={formData.vehicle_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
                    placeholder="Select vehicle..."
                  />
                </div>

                {/* Route Selection */}
                <div className="space-y-2">
                  <Label htmlFor="edit-route">Route *</Label>
                  <TransportRoutesDropdown
                    value={formData.route_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, route_id: value }))}
                    placeholder="Select route..."
                  />
                </div>

                {/* Driver Selection */}
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

                {/* Trip Number */}
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
                <Button variant="outline" onClick={() => {
                  setEditingTrip(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTrip}>
                  Update Trip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}