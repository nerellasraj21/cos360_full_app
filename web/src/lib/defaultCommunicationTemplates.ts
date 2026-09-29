// src/lib/defaultCommunicationTemplates.ts
// Default SMS/notification templates used across Admission, Attendance, Staff,
// Fee Collection, Exams, Marks Entry, Holidays and Homework Diary.
// These are seed values only — actual records are created via the Communication
// → Templates API (see useCreateTemplate) and then live in the backend.

import type { TemplateCreate } from '@/types/communication';

export const DEFAULT_COMMUNICATION_TEMPLATES: TemplateCreate[] = [
  {
    name: 'Welcome',
    channel: 'sms',
    body: 'Dear {{father_name}}, we welcome {{student_name}}, admission no {{admission_no}}. {{school_name}}, {{location}}',
  },
  {
    name: 'Student Absentees',
    channel: 'sms',
    body: 'Dear parent, your {{student_name}} ({{date}}) is absent today. {{school_name}}, {{location}}',
  },
  {
    name: 'Staff Recruiting',
    channel: 'sms',
    body: 'Dear candidate, Congratulations {{staff_name}}, we warmly welcome you to the team and wish you all the best. Thank you. {{school_name}}',
  },
  {
    name: 'Staff Attendance',
    channel: 'sms',
    body: 'Dear {{staff_name}}, your attendance is marked as leave/absent today ({{date}}). {{school_name}}, {{location}}',
  },
  {
    name: 'Fee Collection',
    channel: 'sms',
    body: 'Dear parent, we have received payment of ₹{{amount}} for {{student_name}}, {{class_name}} {{section_name}}, Receipt no {{receipt_no}}. Thank you for the payment.',
  },
  {
    name: 'Exam Schedule',
    channel: 'sms',
    body: 'Dear parent, the {{exam_name}} exam for {{student_name}} begins on {{exam_date}}. Timetable available on the app.',
  },
  {
    name: 'Mark Entry',
    channel: 'sms',
    body: 'Dear parent, results for {{student_name}}, {{exam_name}} ({{exam_code}}): {{subject_code}} - {{marks}} marks. {{school_name}}, {{location}}',
  },
  {
    name: 'Holiday',
    channel: 'sms',
    body: 'Dear parent, school will be closed for holiday on {{date}}{{reason}}. {{school_name}}',
  },
  {
    name: 'Homework Diary',
    channel: 'sms',
    body: 'Homework for {{student_name}} ({{class_name}}-{{section_name}}): {{subject}} - {{homework_details}}',
  },
];
