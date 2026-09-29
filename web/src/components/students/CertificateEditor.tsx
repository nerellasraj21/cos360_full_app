// src/components/students/CertificateEditor.tsx
// WYSIWYG rich-text editor for certificate templates — no HTML knowledge needed

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ChevronDown,
} from "lucide-react";

const VARIABLES = [
  // School
  { label: "School Logo (image)", value: "{{school_logo}}" },
  { label: "School Name", value: "{{school_name}}" },
  // Student identity
  { label: "Student Name", value: "{{student_name}}" },
  { label: "Admission No.", value: "{{admission_number}}" },
  { label: "Date of Birth", value: "{{dob}}" },
  { label: "Gender", value: "{{gender}}" },
  { label: "Aadhaar Number", value: "{{aadhar_number}}" },
  { label: "APAAR Number", value: "{{apaar_number}}" },
  // Class
  { label: "Class", value: "{{class_name}}" },
  { label: "Section", value: "{{section}}" },
  { label: "Academic Year", value: "{{academic_year}}" },
  // Parents
  { label: "Father Name", value: "{{father_name}}" },
  { label: "Mother Name", value: "{{mother_name}}" },
  // Guardian
  { label: "Guardian Details (name + relation + phone)", value: "{{guardian_details}}" },
  { label: "Guardian Name", value: "{{guardian_name}}" },
  { label: "Guardian Phone", value: "{{guardian_phone}}" },
  { label: "Guardian Relation", value: "{{guardian_relation}}" },
  // Dates
  { label: "Date of Joining School", value: "{{date_of_joining}}" },
  { label: "Date of Leaving School", value: "{{date_of_leaving}}" },
  { label: "Date of Joining Current Class", value: "{{date_of_joining_class}}" },
  { label: "Date of Leaving Current Class", value: "{{date_of_leaving_class}}" },
  { label: "Issue Date", value: "{{issue_date}}" },
  // Gender pronouns
  { label: "He / She", value: "{{gender_he_she}}" },
  { label: "His / Her", value: "{{gender_his_her}}" },
];

interface CertificateEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  minHeight?: string;
}

export function CertificateEditor({
  initialContent,
  onChange,
  minHeight = "320px",
}: CertificateEditorProps) {
  const [showVarMenu, setShowVarMenu] = useState(false);
  const varMenuRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    content: initialContent || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Close variable menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (varMenuRef.current && !varMenuRef.current.contains(e.target as Node)) {
        setShowVarMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const insertVariable = (variable: string) => {
    editor?.chain().focus().insertContent(variable).run();
    setShowVarMenu(false);
  };

  const ToolbarBtn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
        {/* Heading select */}
        <select
          value={
            editor?.isActive("heading", { level: 1 })
              ? "1"
              : editor?.isActive("heading", { level: 2 })
                ? "2"
                : editor?.isActive("heading", { level: 3 })
                  ? "3"
                  : "p"
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === "p") editor?.chain().focus().setParagraph().run();
            else
              editor
                ?.chain()
                .focus()
                .toggleHeading({ level: Number(val) as 1 | 2 | 3 })
                .run();
          }}
          className="text-xs border rounded px-1.5 h-8 bg-background cursor-pointer mr-1"
        >
          <option value="p">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <div className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn
          active={editor?.isActive({ textAlign: "left" })}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive({ textAlign: "center" })}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive({ textAlign: "right" })}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-0.5" />

        <ToolbarBtn
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Insert Variable dropdown */}
        <div className="relative" ref={varMenuRef}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowVarMenu((prev) => !prev)}
            className="h-8 gap-1 text-xs px-2"
          >
            Insert Variable
            <ChevronDown className="h-3 w-3" />
          </Button>

          {showVarMenu && (
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 min-w-[230px] py-1">
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium border-b mb-1">
                Click to insert at cursor
              </p>
              {VARIABLES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center justify-between gap-4"
                  onClick={() => insertVariable(v.value)}
                >
                  <span className="font-medium">{v.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {v.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={[
          "bg-white dark:bg-background px-4 py-3",
          // Remove outline on the inner tiptap div
          "[&_.tiptap]:outline-none",
          // Headings
          "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-3",
          "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:mb-2",
          "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mb-2",
          // Paragraphs & lists
          "[&_.tiptap_p]:mb-2 [&_.tiptap_p]:leading-relaxed",
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:ml-5 [&_.tiptap_ul]:mb-2",
          "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:ml-5 [&_.tiptap_ol]:mb-2",
          // Variable highlights — make {{...}} stand out slightly
          "[&_.tiptap]:whitespace-pre-wrap",
        ].join(" ")}
      />
    </div>
  );
}
