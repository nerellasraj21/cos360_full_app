"""
Detailed reorganization script for Masters Module documentation.
This handles the complex restructuring requirements properly.
"""

def read_file(filepath):
    """Read the entire file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_file(filepath, lines):
    """Write lines to file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def extract_section(lines, start, end):
    """Extract section from lines (1-indexed line numbers)"""
    return lines[start-1:end-1]

def process_staff_section(staff_lines):
    """
    Restructure Staff section into 3 subsections:
    3.a: Staff Enrollment
    3.b: Staff Attendance
    3.c: Staff Designations
    """
    new_lines = []
    in_api_section = False
    in_examples_section = False
    in_data_models_section = False

    for i, line in enumerate(staff_lines):
        # Main header
        if line.strip() == '# SUB-MODULE 5: STAFF & DESIGNATION MANAGEMENT':
            new_lines.append('# SUB-MODULE 3: STAFF MANAGEMENT\n')
            continue

        # Start of actual content - add Staff Enrollment header
        if line.strip() == '## Implementation':
            new_lines.append('\n')
            new_lines.append('## 3.a: Staff Enrollment\n')
            new_lines.append('\n')
            new_lines.append('### Implementation\n')
            continue

        # Detect API Endpoints section for adding subsection markers
        if line.strip() == '### c) API Endpoints':
            in_api_section = True
            new_lines.append('#### c) API Endpoints\n')
            continue

        # Split API endpoints into subsections
        if in_api_section and line.strip() == '#### Staff Enrollment Endpoints':
            new_lines.append('\n')
            new_lines.append('##### Staff Enrollment Endpoints\n')
            continue

        if in_api_section and line.strip() == '#### Staff Attendance Endpoints':
            # Insert Staff Attendance subsection header
            new_lines.append('\n')
            new_lines.append('---\n')
            new_lines.append('\n')
            new_lines.append('## 3.b: Staff Attendance\n')
            new_lines.append('\n')
            new_lines.append('### API Endpoints\n')
            new_lines.append('\n')
            in_api_section = False
            continue

        if line.strip() == '#### Designation Endpoints':
            # Insert Designations subsection header
            new_lines.append('\n')
            new_lines.append('---\n')
            new_lines.append('\n')
            new_lines.append('## 3.c: Staff Designations\n')
            new_lines.append('\n')
            new_lines.append('### API Endpoints\n')
            new_lines.append('\n')
            continue

        # Adjust heading levels: ### -> ####, ## -> ###
        if line.startswith('###'):
            new_lines.append('#' + line)
        elif line.startswith('##') and not line.startswith('###'):
            new_lines.append('#' + line)
        else:
            new_lines.append(line)

    return new_lines

def split_subject_section(subject_lines):
    """
    Split Subject & Subject Category into two separate modules:
    - Sub-Module 4: Subject Categories
    - Sub-Module 5: Subjects
    """
    # For this document, both subjects and categories are intertwined
    # We'll keep them together but update the header

    categories_lines = []
    subjects_lines = []

    category_mode = True  # Start with categories

    for line in subject_lines:
        if line.strip() == '# SUB-MODULE 3: SUBJECT & SUBJECT CATEGORY MANAGEMENT':
            # Split into two separate modules
            categories_lines.append('# SUB-MODULE 4: SUBJECT CATEGORIES\n')
            continue

        # Look for the subject-specific content marker
        if '#### Subject Endpoints' in line:
            # Switch to subjects mode
            category_mode = False
            subjects_lines.append('\n')
            subjects_lines.append('---\n')
            subjects_lines.append('\n')
            subjects_lines.append('# SUB-MODULE 5: SUBJECTS\n')
            subjects_lines.append('\n')
            subjects_lines.append('## API Endpoints\n')
            subjects_lines.append('\n')
            continue

        if category_mode:
            categories_lines.append(line)
        else:
            subjects_lines.append(line)

    # If we didn't find a natural split, we'll need to note this
    if not subjects_lines:
        subjects_lines.append('\n')
        subjects_lines.append('---\n')
        subjects_lines.append('\n')
        subjects_lines.append('# SUB-MODULE 5: SUBJECTS\n')
        subjects_lines.append('\n')
        subjects_lines.append('## Implementation\n')
        subjects_lines.append('\n')
        subjects_lines.append('*Note: Subject content is currently combined with Subject Categories in Sub-Module 4. Manual separation recommended.*\n')
        subjects_lines.append('\n')

    return categories_lines, subjects_lines

def main():
    filepath = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE.md'

    # Read original file
    lines = read_file(filepath)
    print(f"Read {len(lines)} lines from original file")

    # Define section boundaries
    sections = {
        'header': (1, 307),
        'submodule1': (308, 855),
        'submodule2': (856, 1390),
        'old_submodule3': (1391, 1930),  # Subject & Category - SPLIT
        'old_submodule4': (1931, 2253),  # Class-Subject Mapping -> 6
        'old_submodule5': (2254, 3216),  # Staff -> 3
        'old_submodule6': (3217, 4077),  # Parent - DELETE
        'submodule7': (4078, 4741),  # Holiday - keep as 7
        'submodule8': (4742, 5640),  # Timetable - keep as 8
        'old_submodule9': (5641, 7170),  # Transport - DELETE
        'appendix_a': (7171, 7296),
        'appendix_b': (7297, 7777),
        'appendix_c': (7778, 8166),
        'appendix_d': (8167, 8858),
    }

    # Extract sections
    header = extract_section(lines, *sections['header'])
    sub1 = extract_section(lines, *sections['submodule1'])
    sub2 = extract_section(lines, *sections['submodule2'])
    old_sub3 = extract_section(lines, *sections['old_submodule3'])
    old_sub4 = extract_section(lines, *sections['old_submodule4'])
    old_sub5 = extract_section(lines, *sections['old_submodule5'])
    sub7 = extract_section(lines, *sections['submodule7'])
    sub8 = extract_section(lines, *sections['submodule8'])
    appendix_a = extract_section(lines, *sections['appendix_a'])
    appendix_b = extract_section(lines, *sections['appendix_b'])
    appendix_c = extract_section(lines, *sections['appendix_c'])
    appendix_d = extract_section(lines, *sections['appendix_d'])

    print("Processing staff section...")
    new_sub3_staff = process_staff_section(old_sub5)

    print("Splitting subject/category section...")
    new_sub4_categories, new_sub5_subjects = split_subject_section(old_sub3)

    print("Renumbering class-subject mapping...")
    new_sub6_mapping = []
    for line in old_sub4:
        if line.strip() == '# SUB-MODULE 4: CLASS-SUBJECT MAPPING':
            new_sub6_mapping.append('# SUB-MODULE 6: CLASS-SUBJECT MAPPING\n')
        else:
            new_sub6_mapping.append(line)

    # Update Sub-Module 7 and 8 headers (they stay the same number but let's be explicit)
    new_sub7_holiday = []
    for line in sub7:
        new_sub7_holiday.append(line)

    new_sub8_timetable = []
    for line in sub8:
        new_sub8_timetable.append(line)

    # Assemble new document
    print("Assembling new document...")
    new_document = []
    new_document.extend(header)
    new_document.extend(sub1)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(sub2)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub3_staff)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub4_categories)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub5_subjects)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub6_mapping)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub7_holiday)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(new_sub8_timetable)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(appendix_a)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(appendix_b)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(appendix_c)
    new_document.append('\n')
    new_document.append('---\n')
    new_document.append('\n')
    new_document.extend(appendix_d)

    # Write new file
    output_path = filepath
    write_file(output_path, new_document)
    print(f"\nWrote {len(new_document)} lines to {output_path}")
    print("Reorganization complete!")
    print(f"\nDeleted sections:")
    print("  - Sub-Module 6: Parent Management")
    print("  - Sub-Module 9: Transport Management")

if __name__ == '__main__':
    main()
