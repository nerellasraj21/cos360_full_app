"""
Clean reorganization - extract each section carefully and rebuild.
"""

def read_lines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_lines(filepath, lines):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def find_headers(lines):
    """Find all major headers and their line numbers"""
    headers = {}
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('# SUB-MODULE'):
            # Extract which sub-module this is
            parts = stripped.split(':', 1)
            if len(parts) >= 2:
                module_num_part = parts[0].replace('# SUB-MODULE', '').strip()
                name_part = parts[1].strip()
                headers[i] = (module_num_part, name_part, stripped)
        elif stripped.startswith('# APPENDIX'):
            headers[i] = ('APPENDIX', stripped.replace('# APPENDIX ', '').split(':')[0], stripped)
    return headers

def extract_section(lines, start_line, end_line):
    """Extract lines from start to end"""
    return lines[start_line:end_line]

def main():
    filepath = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE_REORGANIZED.md'
    output_path = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE.md'

    lines = read_lines(filepath)
    print(f"Read {len(lines)} lines")

    # Find all headers
    headers = find_headers(lines)
    sorted_headers = sorted(headers.items())

    print("\nFound headers:")
    for line_num, (module_num, name, full_header) in sorted_headers:
        print(f"  Line {line_num}: {module_num} - {name}")

    # Define section ranges
    sections = {}
    for i, (line_num, (module_num, name, full_header)) in enumerate(sorted_headers):
        next_line = sorted_headers[i+1][0] if i+1 < len(sorted_headers) else len(lines)
        sections[(module_num, name)] = (line_num, next_line)

    print("\nSection ranges:")
    for (module_num, name), (start, end) in sections.items():
        print(f"  {module_num} {name}: lines {start}-{end} ({end-start} lines)")

    # Extract header (everything before first SUB-MODULE)
    first_module_line = min(headers.keys())
    header_section = lines[:first_module_line]

    # Extract sections we want to keep
    # We need to find them by their content, not their numbering
    academic_year = None
    class_section = None
    old_subject_category = None
    old_class_mapping = None
    old_staff = None
    holiday = None
    timetable = None
    appendices = {}

    for (module_num, name), (start, end) in sections.items():
        if 'ACADEMIC YEAR' in name.upper():
            academic_year = extract_section(lines, start, end)
        elif 'CLASS & SECTION' in name.upper():
            class_section = extract_section(lines, start, end)
        elif 'SUBJECT & SUBJECT CATEGORY' in name.upper():
            old_subject_category = extract_section(lines, start, end)
        elif 'CLASS-SUBJECT MAPPING' in name.upper():
            old_class_mapping = extract_section(lines, start, end)
        elif 'STAFF' in name.upper() and 'DESIGNATION' in name.upper():
            old_staff = extract_section(lines, start, end)
        elif 'HOLIDAY' in name.upper():
            holiday = extract_section(lines, start, end)
        elif 'TIMETABLE' in name.upper():
            timetable = extract_section(lines, start, end)
        elif module_num == 'APPENDIX':
            appendices[name] = extract_section(lines, start, end)

    print("\nExtracted sections:")
    print(f"  Academic Year: {len(academic_year) if academic_year else 0} lines")
    print(f"  Class & Section: {len(class_section) if class_section else 0} lines")
    print(f"  Subject & Category: {len(old_subject_category) if old_subject_category else 0} lines")
    print(f"  Class-Subject Mapping: {len(old_class_mapping) if old_class_mapping else 0} lines")
    print(f"  Staff: {len(old_staff) if old_staff else 0} lines")
    print(f"  Holiday: {len(holiday) if holiday else 0} lines")
    print(f"  Timetable: {len(timetable) if timetable else 0} lines")
    print(f"  Appendices: {len(appendices)}")

    # Build new document
    new_doc = []
    new_doc.extend(header_section)

    # Sub-Module 1: Academic Year
    if academic_year:
        new_doc.extend(academic_year)
        new_doc.append('\n---\n\n')

    # Sub-Module 2: Class & Section
    if class_section:
        new_doc.extend(class_section)
        new_doc.append('\n---\n\n')

    # Sub-Module 3: Staff (change header)
    if old_staff:
        new_staff = []
        for line in old_staff:
            if line.strip() == '# SUB-MODULE 5: STAFF & DESIGNATION MANAGEMENT':
                new_staff.append('# SUB-MODULE 3: STAFF MANAGEMENT\n')
            elif line.strip() == '# SUB-MODULE 3: STAFF MANAGEMENT':
                new_staff.append(line)  # Already changed
            else:
                new_staff.append(line)
        new_doc.extend(new_staff)
        new_doc.append('\n---\n\n')

    # Sub-Module 4: Subject Categories (change header)
    if old_subject_category:
        new_subject_cat = []
        for line in old_subject_category:
            if line.strip() == '# SUB-MODULE 3: SUBJECT & SUBJECT CATEGORY MANAGEMENT':
                new_subject_cat.append('# SUB-MODULE 4: SUBJECT CATEGORIES\n')
            else:
                new_subject_cat.append(line)
        new_doc.extend(new_subject_cat)
        new_doc.append('\n---\n\n')

    # Sub-Module 5: Subjects (placeholder)
    new_doc.append('# SUB-MODULE 5: SUBJECTS\n\n')
    new_doc.append('## Implementation\n\n')
    new_doc.append('*Note: Subject-specific content should be extracted from Sub-Module 4 above. This is a placeholder for manual content separation.*\n\n')
    new_doc.append('\n---\n\n')

    # Sub-Module 6: Class-Subject Mapping (change header)
    if old_class_mapping:
        new_mapping = []
        for line in old_class_mapping:
            if line.strip() == '# SUB-MODULE 4: CLASS-SUBJECT MAPPING':
                new_mapping.append('# SUB-MODULE 6: CLASS-SUBJECT MAPPING\n')
            else:
                new_mapping.append(line)
        new_doc.extend(new_mapping)
        new_doc.append('\n---\n\n')

    # Sub-Module 7: Holiday
    if holiday:
        new_doc.extend(holiday)
        new_doc.append('\n---\n\n')

    # Sub-Module 8: Timetable
    if timetable:
        new_doc.extend(timetable)
        new_doc.append('\n---\n\n')

    # Appendices (in order A, B, C, D)
    for appendix_name in ['A', 'B', 'C', 'D']:
        if appendix_name in appendices:
            new_doc.extend(appendices[appendix_name])
            new_doc.append('\n---\n\n')

    # Write output
    write_lines(output_path, new_doc)
    print(f"\nWrote {len(new_doc)} lines to {output_path}")
    print("\nDeleted modules:")
    print("  ✗ Parent Management")
    print("  ✗ Transport Management")

if __name__ == '__main__':
    main()
