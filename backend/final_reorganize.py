"""
Final comprehensive reorganization script.
This will properly reorganize the entire document from scratch.
"""
import re

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # Use ORIGINAL_BEFORE_CHANGES as source since it should have clean structure
    source_file = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\ORIGINAL_BEFORE_CHANGES.md'
    output_file = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE.md'

    print("Reading source file...")
    content = read_file(source_file)

    # Split content into major sections using regex
    # Find all sub-module sections
    submodule_pattern = r'(# SUB-MODULE \d+:.*?)(?=# SUB-MODULE \d+:|# APPENDIX|$)'
    appendix_pattern = r'(# APPENDIX [A-D]:.*?)(?=# APPENDIX [A-D]:|$)'

    # Extract header (everything before SUB-MODULE 1)
    header_match = re.search(r'(.+?)(?=# SUB-MODULE 1:)', content, re.DOTALL)
    header = header_match.group(1) if header_match else ""

    # Extract all sub-modules
    submodules = re.findall(submodule_pattern, content, re.DOTALL)
    print(f"Found {len(submodules)} sub-modules")

    # Extract appendices
    appendices_section = re.search(r'(# APPENDIX A:.+)', content, re.DOTALL)
    if appendices_section:
        appendices_text = appendices_section.group(1)
        appendices = re.findall(appendix_pattern, appendices_text, re.DOTALL)
        print(f"Found {len(appendices)} appendices")
    else:
        appendices = []
        print("WARNING: No appendices found!")

    # Now reorganize based on current module numbers
    # Current structure should be:
    # 1 = Academic Year (keep)
    # 2 = Class & Section (keep)
    # 3 = Subject & Category (split into 4 and 5)
    # 4 = Class-Subject Mapping (move to 6)
    # 5 = Staff & Designation (move to 3, restructure)
    # 6 = Parent (DELETE)
    # 7 = Holiday (keep as 7)
    # 8 = Timetable (keep as 8)
    # 9 = Transport (DELETE)

    # Map old to new
    module_map = {}
    for i, module in enumerate(submodules, 1):
        if '# SUB-MODULE 1:' in module[:50]:
            module_map[1] = module
        elif '# SUB-MODULE 2:' in module[:50]:
            module_map[2] = module
        elif '# SUB-MODULE 3:' in module[:50]:
            module_map['old_3'] = module  # Will split
        elif '# SUB-MODULE 4:' in module[:50]:
            module_map['old_4'] = module  # Move to 6
        elif '# SUB-MODULE 5:' in module[:50]:
            module_map['old_5'] = module  # Move to 3
        elif '# SUB-MODULE 6:' in module[:50]:
            module_map['old_6'] = None  # DELETE
        elif '# SUB-MODULE 7:' in module[:50]:
            module_map[7] = module
        elif '# SUB-MODULE 8:' in module[:50]:
            module_map[8] = module
        elif '# SUB-MODULE 9:' in module[:50]:
            module_map['old_9'] = None  # DELETE

    print(f"Module map created: {list(module_map.keys())}")

    # Build new document
    new_content = []

    # Add header
    new_content.append(header)

    # Add Sub-Module 1 (Academic Year)
    new_content.append(module_map[1])
    new_content.append("\n---\n\n")

    # Add Sub-Module 2 (Class & Section)
    new_content.append(module_map[2])
    new_content.append("\n---\n\n")

    # Add Sub-Module 3 (Staff - was old 5)
    staff_module = module_map.get('old_5', '')
    # Change header
    staff_module = staff_module.replace('# SUB-MODULE 5: STAFF & DESIGNATION MANAGEMENT',
                                       '# SUB-MODULE 3: STAFF MANAGEMENT')
    new_content.append(staff_module)
    new_content.append("\n---\n\n")

    # Add Sub-Module 4 (Subject Categories - from old 3)
    subject_module = module_map.get('old_3', '')
    # For now, keep combined but change header
    subject_module = subject_module.replace('# SUB-MODULE 3: SUBJECT & SUBJECT CATEGORY MANAGEMENT',
                                           '# SUB-MODULE 4: SUBJECT CATEGORIES')
    new_content.append(subject_module)
    new_content.append("\n---\n\n")

    # Add Sub-Module 5 (Subjects - placeholder)
    new_content.append("# SUB-MODULE 5: SUBJECTS\n\n")
    new_content.append("*Note: Subject-related content should be separated from Sub-Module 4.*\n\n")
    new_content.append("\n---\n\n")

    # Add Sub-Module 6 (Class-Subject Mapping - was old 4)
    mapping_module = module_map.get('old_4', '')
    mapping_module = mapping_module.replace('# SUB-MODULE 4: CLASS-SUBJECT MAPPING',
                                           '# SUB-MODULE 6: CLASS-SUBJECT MAPPING')
    new_content.append(mapping_module)
    new_content.append("\n---\n\n")

    # Add Sub-Module 7 (Holiday)
    new_content.append(module_map[7])
    new_content.append("\n---\n\n")

    # Add Sub-Module 8 (Timetable)
    new_content.append(module_map[8])
    new_content.append("\n---\n\n")

    # Add appendices
    for appendix in appendices:
        new_content.append(appendix)
        new_content.append("\n---\n\n")

    # Join and write
    final_content = ''.join(new_content)

    # Write output
    write_file(output_file, final_content)
    print(f"\nWrote reorganized content to {output_file}")
    print("\nChanges made:")
    print("  ✓ Moved Staff (old 5) to Sub-Module 3")
    print("  ✓ Renamed Subject section to Sub-Module 4 (Categories)")
    print("  ✓ Added placeholder for Sub-Module 5 (Subjects)")
    print("  ✓ Moved Class-Subject Mapping (old 4) to Sub-Module 6")
    print("  ✓ Kept Holiday as Sub-Module 7")
    print("  ✓ Kept Timetable as Sub-Module 8")
    print("  ✗ Deleted Parent Management (old 6)")
    print("  ✗ Deleted Transport Management (old 9)")

if __name__ == '__main__':
    main()
