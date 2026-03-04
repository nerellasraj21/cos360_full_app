import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDrop, useDrag } from "react-dnd";
import { addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader as DialogH, DialogTitle as DialogT, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeactivateHoliday as useDeleteHoliday } from "@/api/hooks/masters/holiday";
import type { HolidayRead } from "@/types/masters/holiday";
import { useAcademicYearStore } from "@/lib/academicYearStore";
import { usePermission } from "@/hooks/usePermission";

type ViewType = "month" | "week" | "year" | "vertical" | "day" | "all";

function getMonthDays(current: Date) {
  const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
  const days = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

function getWeekDays(current: Date) {
  const start = startOfWeek(current, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function useDayDrop(
  targetDate: Date,
  onDrop: (event: HolidayRead, newStart: Date, newEnd: Date) => void
) {
  return useDrop({
    accept: "event",
    drop: (item: HolidayRead) => {
      const originalStart = parseISO(item.start_date);
      const originalEnd = parseISO(item.end_date);
      const duration = originalEnd.getTime() - originalStart.getTime();
      const newStart = targetDate;
      const newEnd = new Date(newStart.getTime() + duration);
      onDrop(item, newStart, newEnd);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
}

interface DayCellProps {
  day: Date;
  children: React.ReactNode;
  onDrop: (event: HolidayRead, newStart: Date, newEnd: Date) => void;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}

function DayCell({ day, children, onDrop, className, onClick, style }: DayCellProps) {
  const [, dropRef] = useDayDrop(day, onDrop);
  const setDropCallbackRef = (node: HTMLDivElement | null) => {
    if (node) dropRef(node);
  };
  return (
    <div ref={setDropCallbackRef} className={className} onClick={onClick} style={style}>
      {children}
    </div>
  );
}

export function Calendar() {
  const [view, setView] = useState<ViewType>("month");
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isAddDirty, setIsAddDirty] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HolidayRead | null>(null);
  const [newEventColor, setNewEventColor] = useState("#2563eb"); // default to Tailwind blue-600


  // Pagination state for All Events view
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Search/sort state for All Events view
  const [allEventsSearch, setAllEventsSearch] = useState("");
  const [allEventsSortKey, setAllEventsSortKey] = useState<string | null>(null);
  const [allEventsSortDir, setAllEventsSortDir] = useState<'asc' | 'desc'>('asc');

  const { selectedAcademicYearId, fetchAndSetAcademicYears } = useAcademicYearStore();

  useEffect(() => {
    fetchAndSetAcademicYears();
  }, []);

  const holidaysQueryParams =
    view === "all"
      ? { academic_year_id: selectedAcademicYearId, limit: pageSize, skip: page * pageSize }
      : { academic_year_id: selectedAcademicYearId };

  const { data: holidays, isLoading, isError } = useHolidays(holidaysQueryParams);

  // Reset page to 0 when switching to "all" view
  useEffect(() => {
    if (view === "all") setPage(0);
  }, [view]);

  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  // Permission checks for UI elements
  const { checkPermission } = usePermission();
  const hasCreatePermission = checkPermission('holidays', 'create');
  const hasUpdatePermission = checkPermission('holidays', 'update');
  const hasDeletePermission = checkPermission('holidays', 'delete');

  // Map holidays to events (no need to map, just use holidays as events)
  const events: HolidayRead[] = holidays?.items || [];

  // Filtered and sorted events for All Events view (client-side)
  const filteredAndSortedEvents = useMemo(() => {
    let items = holidays?.items || [];
    if (allEventsSearch.trim()) {
      const q = allEventsSearch.toLowerCase();
      items = items.filter(ev =>
        ev.name.toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q)
      );
    }
    if (allEventsSortKey) {
      items = [...items].sort((a, b) => {
        const aVal = allEventsSortKey === 'name' ? a.name : allEventsSortKey === 'start_date' ? a.start_date : a.end_date;
        const bVal = allEventsSortKey === 'name' ? b.name : allEventsSortKey === 'start_date' ? b.start_date : b.end_date;
        const cmp = (aVal || '').localeCompare(bVal || '');
        return allEventsSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [holidays?.items, allEventsSearch, allEventsSortKey, allEventsSortDir]);

  const handleDrop = (event: HolidayRead, newStart: Date, newEnd: Date) => {
    if (!event.id || typeof event.id !== 'string' || event.id.trim() === '') {
      console.error('Invalid holiday ID for drag and drop update:', event.id);
      return;
    }
    updateHoliday.mutate({
      holidayId: event.id,
      holiday: {
        name: event.name,
        description: event.description,
        start_date: format(newStart, "yyyy-MM-dd"),
        end_date: format(newEnd, "yyyy-MM-dd"),
        is_active: event.is_active,
        color: event.color,
      },
    });
  };

  // Render month view
  const renderMonth = () => {
    const days = getMonthDays(current);
    // Group days into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return (
      <div>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        {weeks.map((week, weekIdx) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const multiDayEvents = events.filter(ev => {
            const evStart = parseISO(ev.start_date);
            const evEnd = parseISO(ev.end_date);
            return (
              (isWithinInterval(weekStart, { start: evStart, end: evEnd }) ||
                isWithinInterval(weekEnd, { start: evStart, end: evEnd }) ||
                (evStart <= weekStart && evEnd >= weekEnd) ||
                isWithinInterval(evStart, { start: weekStart, end: weekEnd }) ||
                isWithinInterval(evEnd, { start: weekStart, end: weekEnd })) &&
              evStart.getTime() !== evEnd.getTime() // Only multi-day
            );
          });
          return (
            <div key={weekIdx} className="grid grid-cols-7 gap-1 relative mb-1" style={{ minHeight: `${80 + multiDayEvents.length * 24}px` }}>
              {/* Render multi-day event bars as absolutely positioned overlays */}
              {multiDayEvents.map((ev, evIdx) => {
                const evStart = parseISO(ev.start_date);
                const evEnd = parseISO(ev.end_date);
                const startIdx = Math.max(0, Math.floor((evStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
                const endIdx = Math.min(6, Math.floor((evEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
                const leftPercent = (startIdx / 7) * 100;
                const widthPercent = ((endIdx - startIdx + 1) / 7) * 100;
                return (
                  <DraggableMultiDayEvent
                    key={ev.id}
                    ev={ev}
                    style={{
                      top: `${28 + evIdx * 24}px`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: '20px',
                      borderRadius: '6px',
                      margin: '0 2px',
                      boxSizing: 'border-box',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedEvent(ev);
                      setIsEditDirty(false); setShowEditDialog(true);
                    }}
                  />
                );
              })}

              {week.map((day, i) => {
                let dayDiv: HTMLDivElement | null = null;
                const singleDayEvents = events.filter(ev => {
                  const evStart = parseISO(ev.start_date);
                  const evEnd = parseISO(ev.end_date);
                  return (
                    isWithinInterval(day, { start: evStart, end: evEnd }) &&
                    evStart.getTime() === evEnd.getTime() // Only single-day events
                  );
                });
                return (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    onDrop={handleDrop}
                    className={cn(
                      "min-h-[80px] border rounded-lg p-1 cursor-pointer relative group transition-all",
                      isSameDay(day, new Date()) && "bg-accent/30 border-primary",
                      !isSameMonth(day, current) && "bg-muted/30 text-muted-foreground"
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      setNewEventStart(format(day, "yyyy-MM-dd"));
                      setNewEventEnd(format(day, "yyyy-MM-dd"));
                      setIsAddDirty(false);
                      setShowAddDialog(true);
                    }}
                    style={{ position: 'relative' }}
                  >
                    <div className="absolute top-1 right-2 text-xs">{format(day, "d")}</div>
                    <div className="flex flex-col gap-1 mt-5">
                      {singleDayEvents.map(ev => (
                        <DraggableEvent
                          key={ev.id}
                          ev={ev}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                            setIsEditDirty(false); setShowEditDialog(true);
                          }}
                        />
                      ))}
                    </div>
                  </DayCell>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };


  const renderWeek = () => {
    const days = getWeekDays(current);
    return (
      <div>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = events.filter(ev =>
              isWithinInterval(day, {
                start: parseISO(ev.start_date),
                end: parseISO(ev.end_date)
              })
            );
            return (
              <DayCell
                key={day.toISOString()}
                day={day}
                onDrop={handleDrop}
                className={cn(
                  "min-h-[100px] border rounded-lg p-1 cursor-pointer relative group transition-all",
                  isSameDay(day, new Date()) && "bg-accent/30 border-primary"
                )}
                onClick={() => {
                  setSelectedDate(day);
                  setNewEventStart(format(day, "yyyy-MM-dd"));
                  setNewEventEnd(format(day, "yyyy-MM-dd"));
                  setIsAddDirty(false);
                  setShowAddDialog(true);
                }}
                style={{ position: 'relative' }}
              >
                <div className="absolute top-1 right-2 text-xs">{format(day, "d")}</div>
                <div className="flex flex-col gap-1 mt-5">
                  {dayEvents.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No events</span>
                  ) : (
                    dayEvents.map(ev => (
                      <DraggableEvent
                        key={ev.id}
                        ev={ev}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                          setIsEditDirty(false); setShowEditDialog(true);
                        }}
                      />
                    ))
                  )}
                </div>
              </DayCell>
            );
          })}
        </div>
      </div>
    );
  };


  const renderDay = () => {
    const day = selectedDate || current;
    const setDay = (newDay: Date) => {
      setSelectedDate(newDay);
      setCurrent(newDay);
    };
    const dayEvents = events.filter(ev =>
      isWithinInterval(day, {
        start: parseISO(ev.start_date),
        end: parseISO(ev.end_date)
      })
    );
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-lg" title="Previous day" onClick={() => setDay(addDays(day, -1))}>{"<"}</Button>
          <div className="font-semibold text-lg">{format(day, "EEEE, MMMM d, yyyy")}</div>
          <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-lg" title="Next day" onClick={() => setDay(addDays(day, 1))}>{">"}</Button>
          {hasCreatePermission && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 p-0 text-lg"
              title="Add event"
              onClick={() => {
                setSelectedDate(day);
                setNewEventStart(format(day, "yyyy-MM-dd"));
                setNewEventEnd(format(day, "yyyy-MM-dd"));
                setIsAddDirty(false);
                setShowAddDialog(true);
              }}
            >
              +
            </Button>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-fit mb-2"
          onClick={() => {
            setSelectedDate(null);
            setCurrent(new Date());
          }}
        >
          Today
        </Button>
        <div className="flex flex-col gap-2">
          {dayEvents.length === 0 ? (
            <span className="text-xs text-muted-foreground">No events</span>
          ) : (
            dayEvents.map(ev => (
              <DraggableEvent
                key={ev.id}
                ev={ev}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedEvent(ev);
                  setIsEditDirty(false); setShowEditDialog(true);
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderVertical = () => {
    const days = getMonthDays(current);
    return (
      <div className="flex flex-col gap-4">
        {days.map(day => {
          const dayEvents = events.filter(ev =>
            isWithinInterval(day, {
              start: parseISO(ev.start_date),
              end: parseISO(ev.end_date)
            })
          );
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              onDrop={handleDrop}
              className="border rounded-lg p-2 bg-muted/10"
              onClick={() => {
                setSelectedDate(day);
                setNewEventStart(format(day, "yyyy-MM-dd"));
                setNewEventEnd(format(day, "yyyy-MM-dd"));
                setIsAddDirty(false);
                setShowAddDialog(true);
              }}
            >
              <div className="flex items-center mb-1 gap-2">
                <div className="font-semibold">{format(day, "EEEE, MMM d")}</div>
                {hasCreatePermission && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-lg"
                    title="Add event"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedDate(day);
                      setNewEventStart(format(day, "yyyy-MM-dd"));
                      setNewEventEnd(format(day, "yyyy-MM-dd"));
                      setIsAddDirty(false);
                      setShowAddDialog(true);
                    }}
                  >
                    +
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {dayEvents.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No events</span>
                ) : (
                  dayEvents.map(ev => (
                    <DraggableEvent
                      key={ev.id}
                      ev={ev}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                        setIsEditDirty(false); setShowEditDialog(true);
                      }}
                    />
                  ))
                )}
              </div>
            </DayCell>
          );
        })}
      </div>
    );
  };

  const renderAllEvents = () => {
    if (isLoading) {
      return <div className="text-center py-4">Loading...</div>;
    }
    if (isError) {
      return <div className="text-center text-destructive py-4">Failed to load events</div>;
    }

    const handleSort = (key: string) => {
      if (allEventsSortKey === key) {
        setAllEventsSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setAllEventsSortKey(key);
        setAllEventsSortDir('asc');
      }
    };

    const SortIcon = ({ colKey }: { colKey: string }) => {
      if (allEventsSortKey !== colKey) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 inline opacity-50" />;
      return allEventsSortDir === 'asc'
        ? <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />
        : <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
    };

    return (
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search events..."
              value={allEventsSearch}
              onChange={e => setAllEventsSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2 text-left text-sm font-medium w-12">S.No.</th>
                <th className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Title <SortIcon colKey="name" />
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none" onClick={() => handleSort('start_date')}>
                  Start Date <SortIcon colKey="start_date" />
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none" onClick={() => handleSort('end_date')}>
                  End Date <SortIcon colKey="end_date" />
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">Color</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {allEventsSearch ? 'No events match your search' : 'No events'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedEvents.map((ev, idx) => (
                  <tr key={ev.id || ev.name + ev.start_date} className="border-b hover:bg-accent/20 cursor-pointer" style={{ height: '48px' }}>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1 + page * pageSize}</td>
                    <td className="px-4 py-2 text-sm" onClick={() => { setSelectedEvent(ev); setIsEditDirty(false); setShowEditDialog(true); }}>{ev.name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground" title={ev.description}>{ev.description ? (ev.description.length > 60 ? ev.description.slice(0, 60) + "..." : ev.description) : "-"}</td>
                    <td className="px-4 py-2 text-sm">{ev.start_date}</td>
                    <td className="px-4 py-2 text-sm">{ev.end_date}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: ev.color || "#2563eb" }}></span>
                    </td>
                    <td className="px-4 py-2">
                      {hasUpdatePermission && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedEvent(ev); setIsEditDirty(false); setShowEditDialog(true); }}>Edit</Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination controls: only show in 'All Events' view */}
          {view === "all" && (
            <div className="flex justify-between items-center mt-2">
              <Button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </Button>
              <span>Page {page + 1}</span>
              <Button
                onClick={() => setPage(p => p + 1)}
                disabled={(holidays?.items?.length || 0) < pageSize}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add event handler
  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !newEventStart || !newEventEnd || !selectedAcademicYearId) return;
    await createHoliday.mutateAsync({
      name: newEventTitle,
      description: newEventDescription,
      start_date: newEventStart,
      end_date: newEventEnd,
      is_active: true,
      academic_year_id: selectedAcademicYearId,
    });
    setIsAddDirty(false);
    setShowAddDialog(false);
    setNewEventTitle("");
    setNewEventDescription("");
    setNewEventStart("");
    setNewEventEnd("");
    setNewEventColor("#2563eb");
  };

  const handleEditEvent = async () => {
    if (!selectedEvent || !selectedEvent.id || typeof selectedEvent.id !== 'string' || selectedEvent.id.trim() === '' || !selectedEvent.name.trim() || !selectedEvent.start_date || !selectedEvent.end_date) {
      console.error('Invalid holiday data for edit:', selectedEvent);
      return;
    }
    await updateHoliday.mutateAsync({
      holidayId: selectedEvent.id,
      holiday: {
        name: selectedEvent.name,
        description: selectedEvent.description,
        start_date: selectedEvent.start_date,
        end_date: selectedEvent.end_date,
        is_active: selectedEvent.is_active ?? true,
        color: selectedEvent.color,
      },
    });
    setIsEditDirty(false);
    setShowEditDialog(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !selectedEvent.id || typeof selectedEvent.id !== 'string' || selectedEvent.id.trim() === '') {
      console.error('Invalid holiday ID for deletion:', selectedEvent?.id);
      return;
    }
    await deleteHoliday.mutateAsync(selectedEvent.id);
    setShowEditDialog(false);
    setSelectedEvent(null);
  };

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex gap-2">
          <Button variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>Month</Button>
          {/* <Button variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>Week</Button> */}
          {/* <Button variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>Day</Button> */}
          {/* <Button variant={view === "year" ? "default" : "outline"} onClick={() => setView("year")}>Year</Button> */}
          {/* <Button variant={view === "vertical" ? "default" : "outline"} onClick={() => setView("vertical")}>Day</Button> */}
          <Button variant={view === "all" ? "default" : "outline"} onClick={() => setView("all")}>All Events</Button>
        </div>
        <div className="flex gap-2 items-center">
          {view !== "all" && (
            <>
              <Button variant="ghost" onClick={() => {
                if (view === "month") setCurrent(subMonths(current, 1));
                else if (view === "week") setCurrent(addDays(current, -7));
                else if (view === "day") {
                  setCurrent(addDays(current, -1));
                  setSelectedDate(null);
                }
              }}>{"<"}</Button>
              <CardTitle>{
                view === "year"
                  ? format(current, "yyyy")
                  : view === "month"
                    ? format(current, "MMMM yyyy")
                    : view === "week"
                      ? `${format(startOfWeek(current, { weekStartsOn: 0 }), "MMM d")} - ${format(addDays(startOfWeek(current, { weekStartsOn: 0 }), 6), "MMM d, yyyy")}`
                      : format(current, "MMMM d, yyyy")
              }</CardTitle>
              <Button variant="ghost" onClick={() => {
                if (view === "month") setCurrent(addMonths(current, 1));
                else if (view === "week") setCurrent(addDays(current, 7));
                else if (view === "day") setCurrent(addDays(current, 1));
              }}>{">"}</Button>
            </>
          )}
          {hasCreatePermission && (
            <Button
              variant="default"
              onClick={() => {
                const today = format(new Date(), "yyyy-MM-dd");
                setSelectedDate(new Date());
                setNewEventStart(today);
                setNewEventEnd(today);
                setIsAddDirty(false);
                setShowAddDialog(true);
              }}
            >
              + Add Event
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {view === "month" && renderMonth()}
        {view === "week" && renderWeek()}
        {view === "day" && renderDay()}
        {view === "vertical" && renderVertical()}
        {view === "all" && renderAllEvents()}
      </CardContent>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog} guardDirty={isAddDirty} onDirtyDiscard={() => setIsAddDirty(false)}>
        <DialogContent>
          <DialogH>
            <DialogT>Add Event</DialogT>
            <DialogDescription>Fill in the details to add a new holiday event to the calendar.</DialogDescription>
          </DialogH>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAddEvent();
            }}
            className="space-y-4"
            onChange={() => setIsAddDirty(true)}
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="event-title">Title<span className="text-destructive">*</span></label>
              <input
                id="event-title"
                className="border rounded px-2 py-1 w-full"
                placeholder="Event title"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Date Range<span className="text-destructive">*</span></label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-full"
                  value={newEventStart}
                  onChange={e => setNewEventStart(e.target.value)}
                  required
                />
                <span className="self-center">to</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-full"
                  value={newEventEnd}
                  onChange={e => setNewEventEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="event-color">Event Color</label>
              <div className="flex items-center gap-2">
                <input
                  id="event-color"
                  type="color"
                  className="w-10 h-10 border rounded cursor-pointer"
                  value={newEventColor}
                  onChange={e => setNewEventColor(e.target.value)}
                  title="Pick event color"
                />
                <span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: newEventColor }}></span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="event-description">Description</label>
              <textarea
                id="event-description"
                className="border rounded px-2 py-1 w-full min-h-[60px]"
                placeholder="Event description"
                value={newEventDescription}
                onChange={e => setNewEventDescription(e.target.value)}
              />
            </div>
            {(!newEventTitle.trim() || !newEventStart || !newEventEnd) && (
              <div className="text-destructive text-xs">Please fill in all required fields.</div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createHoliday.isPending}>
                {createHoliday.isPending ? "Adding..." : "Add"}
              </Button>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
        <DialogContent>
          <DialogH>
            <DialogT>Edit Event</DialogT>
            <DialogDescription>Edit the details of this holiday event.</DialogDescription>
          </DialogH>
          {selectedEvent && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleEditEvent();
              }}
              className="space-y-4"
              onChange={() => setIsEditDirty(true)}
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="edit-title">Title<span className="text-destructive">*</span></label>
                <input
                  id="edit-title"
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Event title"
                  value={selectedEvent.name}
                  onChange={e => setSelectedEvent({ ...selectedEvent, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Date Range<span className="text-destructive">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={selectedEvent.start_date}
                    onChange={e => setSelectedEvent({ ...selectedEvent, start_date: e.target.value })}
                    required
                  />
                  <span className="self-center">to</span>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={selectedEvent.end_date}
                    onChange={e => setSelectedEvent({ ...selectedEvent, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="edit-color">Event Color</label>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-color"
                    type="color"
                    className="w-10 h-10 border rounded cursor-pointer"
                    value={selectedEvent.color || "#2563eb"}
                    onChange={e => setSelectedEvent({ ...selectedEvent, color: e.target.value })}
                    title="Pick event color"
                  />
                  <span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: selectedEvent.color || "#2563eb" }}></span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  className="border rounded px-2 py-1 w-full min-h-[60px]"
                  placeholder="Event description"
                  value={selectedEvent.description || ""}
                  onChange={e => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                />
              </div>
              {(!selectedEvent.name.trim() || !selectedEvent.start_date || !selectedEvent.end_date) && (
                <div className="text-destructive text-xs">Please fill in all required fields.</div>
              )}
              <DialogFooter>
                {hasUpdatePermission && (
                  <Button type="submit" disabled={updateHoliday.isPending}>
                    {updateHoliday.isPending ? "Saving..." : "Save"}
                  </Button>
                )}
                {hasDeletePermission && (
                  <Button variant="destructive" type="button" onClick={handleDeleteEvent} disabled={deleteHoliday.isPending}>
                    {deleteHoliday.isPending ? "Deleting..." : "Delete"}
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function DraggableEvent({ ev, onClick }: { ev: HolidayRead, onClick: (e: React.MouseEvent) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: "event",
    item: { ...ev },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  return (
    <div
      ref={node => { drag(node); }}
      className={cn("rounded px-1 py-0.5 text-xs text-white", ev.color || "bg-primary")}
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: ev.color || "#2563eb",
        cursor: "grab",
      }}
      onClick={onClick}
      title={ev.name + (ev.description ? `: ${ev.description}` : "")}
    >
      {ev.name}
      {ev.description && (
        <div className="text-[10px] text-white/80 truncate" style={{ lineHeight: 1 }}>{ev.description.length > 40 ? ev.description.slice(0, 40) + "..." : ev.description}</div>
      )}
    </div>
  );
}

function DraggableMultiDayEvent({ ev, style, onClick }: { ev: HolidayRead, style: React.CSSProperties, onClick: (e: React.MouseEvent) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: "event",
    item: { ...ev },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  return (
    <div
      ref={node => { drag(node); }}
      className="absolute z-10 rounded text-xs text-white flex items-center px-2 cursor-pointer"
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: ev.color || "#2563eb",
      }}
      onClick={onClick}
      title={ev.name + (ev.description ? `: ${ev.description}` : "")}
    >
      {ev.name}
      {ev.description && (
        <span className="ml-2 text-[10px] text-white/80 truncate" style={{ lineHeight: 1 }}>{ev.description.length > 40 ? ev.description.slice(0, 40) + "..." : ev.description}</span>
      )}
    </div>
  );
} 