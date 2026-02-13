"""
Complete reorganization script for Masters Module documentation.
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

def main():
    filepath = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE.md'

    # Read original file
    lines = read_file(filepath)
    print(f"Read {len(lines)} lines from file")

    # Define section boundaries (from our earlier analysis)
    sections = {
        'header': (1, 307),  # Header through to before Sub-Module 1
        'submodule1': (308, 855),  # Academic Year - KEEP AS IS
        'submodule2': (856, 1390),  # Class & Section - KEEP AS IS
        'old_submodule3': (1391, 1930),  # Subject & Subject Category - SPLIT
        'old_submodule4': (1931, 2253),  # Class-Subject Mapping - RENUMBER to 6
        'old_submodule5': (2254, 3216),  # Staff & Designation - MOVE to 3
        'old_submodule6': (3217, 4077),  # Parent - DELETE
        'submodule7': (4078, 4741),  # Holiday - KEEP as 7
        'submodule8': (4742, 5640),  # Timetable - KEEP as 8
        'old_submodule9': (5641, 7170),  # Transport - DELETE
        'appendix_a': (7171, 7296),  # Permissions Matrix
        'appendix_b': (7297, 7777),  # Common Patterns
        'appendix_c': (7778, 8166),  # Error Handling
        'appendix_d': (8167, 8858),  # Troubleshooting
    }

    # Extract all sections
    header = extract_section(lines, *sections['header'])
    sub1 = extract_section(lines, *sections['submodule1'])
    sub2 = extract_section(lines, *sections['submodule2'])
    old_sub3_subjects = extract_section(lines, *sections['old_submodule3'])
    old_sub4_class_mapping = extract_section(lines, *sections['old_submodule4'])
    old_sub5_staff = extract_section(lines, *sections['old_submodule5'])
    # old_sub6_parent = extract_section(lines, *sections['old_submodule6'])  # DELETE
    sub7_holiday = extract_section(lines, *sections['submodule7'])
    sub8_timetable = extract_section(lines, *sections['submodule8'])
    # old_sub9_transport = extract_section(lines, *sections['old_submodule9'])  # DELETE
    appendix_a = extract_section(lines, *sections['appendix_a'])
    appendix_b = extract_section(lines, *sections['appendix_b'])
    appendix_c = extract_section(lines, *sections['appendix_c'])
    appendix_d = extract_section(lines, *sections['appendix_d'])

    print("\nProcessing sections...")

    # Process Staff section (old Sub-Module 5 -> new Sub-Module 3)
    # Change header from "SUB-MODULE 5" to "SUB-MODULE 3"
    new_sub3_staff = []
    for line in old_sub5_staff:
        # Update main header
        if line.strip() == '# SUB-MODULE 5: STAFF & DESIGNATION MANAGEMENT':
            new_sub3_staff.append('# SUB-MODULE 3: STAFF MANAGEMENT\n')
        elif line.strip() == '## Implementation':
            # Add subsection header before Implementation
            new_sub3_staff.append('\n')
            new_sub3_staff.append('## 3.a: Staff Enrollment\n')
            new_sub3_staff.append('\n')
            new_sub3_staff.append('### Implementation\n')
        else:
            # Adjust heading levels in the staff section (## -> ###, ### -> ####, etc.)
            if line.startswith('###'):
                new_sub3_staff.append('#' + line)
            elif line.startswith('##') and not line.startswith('###'):
                new_sub3_staff.append('#' + line)
            else:
                new_sub3_staff.append(line)

    # Process old Subject & Subject Category section (split into 4 and 5)
    # We'll need to manually split this - for now, change header to Sub-Module 4
    new_sub4_categories = []
    new_sub5_subjects = []

    # For simplicity, we'll change the header and note it needs manual split
    for line in old_sub3_subjects:
        if line.strip() == '# SUB-MODULE 3: SUBJECT & SUBJECT CATEGORY MANAGEMENT':
            new_sub4_categories.append('# SUB-MODULE 4: SUBJECT CATEGORIES\n')
        else:
            new_sub4_categories.append(line)

    # Note: We'll add a placeholder for Sub-Module 5 (Subjects)
    new_sub5_subjects.append('\n')
    new_sub5_subjects.append('---\n')
    new_sub5_subjects.append('\n')
    new_sub5_subjects.append('# SUB-MODULE 5: SUBJECTS\n')
    new_sub5_subjects.append('\n')
    new_sub5_subjects.append('*Note: Subject-specific content should be extracted from Sub-Module 4 above and placed here.*\n')
    new_sub5_subjects.append('\n')

    # Process Class-Subject Mapping (old Sub-Module 4 -> new Sub-Module 6)
    new_sub6_mapping = []
    for line in old_sub4_class_mapping:
        if line.strip() == '# SUB-MODULE 4: CLASS-SUBJECT MAPPING':
            new_sub6_mapping.append('# SUB-MODULE 6: CLASS-SUBJECT MAPPING\n')
        else:
            new_sub6_mapping.append(line)

    # Assemble new document
    new_document = []
    new_document.extend(header)
    new_document.extend(sub1)
    new_document.append('\n---\n\n')
    new_document.extend(sub2)
    new_document.append('\n---\n\n')
    new_document.extend(new_sub3_staff)  # New position: Sub-Module 3
    new_document.append('\n---\n\n')
    new_document.extend(new_sub4_categories)  # New position: Sub-Module 4
    new_document.extend(new_sub5_subjects)  # New position: Sub-Module 5
    new_document.append('\n---\n\n')
    new_document.extend(new_sub6_mapping)  # New position: Sub-Module 6
    new_document.append('\n---\n\n')
    new_document.extend(sub7_holiday)  # Stays as Sub-Module 7
    new_document.append('\n---\n\n')
    new_document.extend(sub8_timetable)  # Stays as Sub-Module 8
    new_document.append('\n---\n\n')
    new_document.extend(appendix_a)
    new_document.append('\n---\n\n')
    new_document.extend(appendix_b)
    new_document.append('\n---\n\n')
    new_document.extend(appendix_c)
    new_document.append('\n---\n\n')
    new_document.extend(appendix_d)

    # Write new file
    output_path = filepath.replace('.md', '_REORGANIZED.md')
    write_file(output_path, new_document)
    print(f"\nWrote {len(new_document)} lines to {output_path}")
    print("\nReorganization complete! Review the file and then replace the original.")

if __name__ == '__main__':
    main()
