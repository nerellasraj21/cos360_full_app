// Timetable types and interfaces

export interface TimetableSlotCreate {
  day: string;
  is_break?: boolean;
  break_label?: string;
  subject_options?: TimetableSubjectOptionCreate[];
}

export interface TimetableSubjectOptionCreate {
  subject_id: string;
}

export interface FullTimetableCreate {
  section_id: string;
  slot_time_data: TimetableSlotCreateGrouped[];
}

export interface TimetableSlotCreateGrouped {
  slot_time_id: string;
  slots: TimetableSlotCreate[];
}

export interface TimetableSlotBulkUpdateRequest {
  slots: TimetableSlotBulkUpdateItem[];
}

export interface TimetableSlotBulkUpdateItem {
  id: string;
  day?: string;
  is_break?: boolean;
  break_label?: string;
  subject_options?: TimetableSubjectOptionCreate[];
}

export interface GroupedSectionTimetableOut {
  section_id: string;
  slot_time_data: GroupedSlotOut[];
}

export interface GroupedSlotOut {
  slot_time_id: string;
  slots: TimetableSlotOut[];
}

export interface TimetableSlotOut {
  id: string;
  day: string;
  is_break: boolean;
  break_label?: string;
  subject_options: TimetableSubjectOptionOut[];
}

export interface TimetableSubjectOptionOut {
  id: string;
  subject_id?: string;
}

export interface TimetableDataItem {
  time: {
    from: string;
    to: string;
  };
  type: 'subject' | 'special';
  subjects?: Record<string, string>;
  label?: string;
}

export interface FrontendTimetableCreate {
  section_id: string;
  timetable_data: TimetableDataItem[];
}

export interface FrontendTimetableRead {
  section_id: string;
  timetable_data: TimetableDataItem[];
}