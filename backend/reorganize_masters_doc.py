"""
Script to reorganize the Masters Module Complete Reference document.
This script will:
1. Read the document
2. Identify section boundaries
3. Reorganize sections according to the new structure
4. Remove unwanted sections (Parent Management, Transport Management)
5. Update numbering and references
"""

def read_file(filepath):
    """Read the entire file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readlines()

def find_section_boundaries(lines):
    """Find line numbers for all major sections"""
    sections = {}
    for i, line in enumerate(lines, 1):
        if line.startswith('# SUB-MODULE'):
            # Extract module number and name
            parts = line.split(':', 1)
            if len(parts) == 2:
                module_num = parts[0].strip()
                module_name = parts[1].strip()
                sections[module_num] = {'line': i, 'name': module_name}
        elif line.startswith('# APPENDIX'):
            # Extract appendix name
            appendix_name = line.strip()
            sections[appendix_name] = {'line': i, 'name': appendix_name}
    return sections

def extract_section(lines, start_line, end_line):
    """Extract lines from start to end (1-indexed)"""
    return lines[start_line-1:end_line-1]

def main():
    filepath = r'c:\Users\nerel\Documents\Workspace\PythonWorkspace\COS360\docs\04-modules\masters\MASTERS_MODULE_COMPLETE_REFERENCE.md'

    # Read file
    lines = read_file(filepath)
    print(f"Total lines: {len(lines)}")

    # Find all sections
    sections = find_section_boundaries(lines)
    print("\nSections found:")
    for key, value in sorted(sections.items(), key=lambda x: x[1]['line']):
        print(f"  Line {value['line']}: {key}")

    # Print section ranges
    section_keys = sorted(sections.keys(), key=lambda x: sections[x]['line'])
    print("\nSection ranges:")
    for i, key in enumerate(section_keys):
        start = sections[key]['line']
        end = sections[section_keys[i+1]]['line'] if i+1 < len(section_keys) else len(lines)
        print(f"  {key}: lines {start}-{end-1} ({end-start} lines)")

if __name__ == '__main__':
    main()
