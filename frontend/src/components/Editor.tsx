import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { TextStyle, FontFamily, FontSize, LineHeight, Color } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Extension, Node } from '@tiptap/core';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image as ImageIcon, Table as TableIcon, Type, Palette,
  Search, Quote, Link as LinkIcon, Code, Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon, IndentIncrease, IndentDecrease,
  Undo, Redo, Highlighter, Minus, PenLine, FileText,
  RowsIcon, Columns, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag } from '@/types';
import { useTranslation } from 'react-i18next';

// ── Custom extensions ────────────────────────────────────────────────────────

// Atom inline node for DynaDoc tag placeholders
const TagPlaceholder = Node.create({
  name: 'tagPlaceholder',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      tagName: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-tag'),
        renderHTML: attrs => ({ 'data-tag': attrs.tagName, class: 'tag-placeholder' }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-tag]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, `#${HTMLAttributes['data-tag']}#`];
  },
  addCommands() {
    return {
      insertTag: (tagName: string) => ({ commands }: any) =>
        commands.insertContent({ type: 'tagPlaceholder', attrs: { tagName } }),
    } as any;
  },
});

// ── Section templates ────────────────────────────────────────────────────────

const CONTRACT_TEMPLATES = [
  {
    label: 'Contract Header',
    html: `<h1 style="text-align:center;font-size:20pt;">EMPLOYMENT CONTRACT</h1><p style="text-align:center;">This Employment Contract is entered into on <strong>[START DATE]</strong></p><p>Between:</p><p><strong>[COMPANY NAME]</strong> (hereinafter "Employer")</p><p>And:</p><p><strong>[EMPLOYEE NAME]</strong> (hereinafter "Employee")</p><hr/>`,
  },
  {
    label: 'Position & Duties',
    html: `<h2>1. Position and Duties</h2><p>1.1 The Employee is employed in the position of <strong>[POSITION TITLE]</strong>, reporting to [REPORTING TO].</p><p>1.2 The Employee shall perform the duties as described and such other duties as may reasonably be assigned by the Employer.</p><p>1.3 Place of work: <strong>[WORK LOCATION]</strong></p>`,
  },
  {
    label: 'Commencement & Probation',
    html: `<h2>2. Commencement and Probationary Period</h2><p>2.1 Employment commences on <strong>[START DATE]</strong>.</p><p>2.2 The first <strong>[PROBATION PERIOD]</strong> of employment shall be a probationary period, during which either party may terminate the contract by giving <strong>[PROBATION NOTICE]</strong> written notice.</p>`,
  },
  {
    label: 'Remuneration',
    html: `<h2>3. Remuneration</h2><p>3.1 The Employee shall receive a gross salary of <strong>[SALARY AMOUNT]</strong>, paid [PAYMENT FREQUENCY].</p><p>3.2 The salary is subject to applicable statutory deductions.</p><p>3.3 Salary reviews shall be conducted annually at the discretion of the Employer.</p>`,
  },
  {
    label: 'Working Hours',
    html: `<h2>4. Working Hours</h2><p>4.1 Normal working hours are <strong>[WORKING HOURS]</strong> hours per week, [DAYS OF WEEK].</p><p>4.2 The Employee may be required to work reasonable additional hours as business needs require.</p><p>4.3 Overtime compensation: [OVERTIME TERMS]</p>`,
  },
  {
    label: 'Leave Entitlements',
    html: `<h2>5. Leave Entitlements</h2><p>5.1 <strong>Annual Leave:</strong> The Employee is entitled to <strong>[ANNUAL LEAVE DAYS]</strong> working days of paid annual leave per calendar year.</p><p>5.2 <strong>Sick Leave:</strong> The Employee is entitled to <strong>[SICK LEAVE DAYS]</strong> days of paid sick leave per year. A medical certificate is required after [CERTIFICATE THRESHOLD] consecutive days of absence.</p><p>5.3 Other leave entitlements are governed by applicable legislation.</p>`,
  },
  {
    label: 'Confidentiality',
    html: `<h2>6. Confidentiality</h2><p>6.1 The Employee agrees to hold in strict confidence all proprietary information, trade secrets, and confidential business information of the Employer.</p><p>6.2 This obligation continues after termination of employment without limitation in time.</p><p>6.3 The Employee shall not disclose any such information to any third party without prior written consent of the Employer.</p>`,
  },
  {
    label: 'Intellectual Property',
    html: `<h2>7. Intellectual Property</h2><p>7.1 All works, inventions, software, designs, and deliverables created by the Employee in the course of employment shall be the exclusive property of the Employer.</p><p>7.2 The Employee assigns to the Employer all present and future intellectual property rights in such works.</p>`,
  },
  {
    label: 'Termination',
    html: `<h2>8. Termination</h2><p>8.1 After the probationary period, this contract may be terminated by either party giving <strong>[NOTICE PERIOD]</strong> written notice.</p><p>8.2 The Employer may terminate this contract immediately and without notice for serious misconduct or material breach of this agreement.</p><p>8.3 Upon termination, the Employee shall promptly return all Employer property and documentation.</p>`,
  },
  {
    label: 'Governing Law',
    html: `<h2>9. Governing Law</h2><p>This agreement is governed by and construed in accordance with the laws of <strong>[JURISDICTION]</strong>. Any disputes arising under this agreement shall be subject to the exclusive jurisdiction of the courts of [COURT JURISDICTION].</p>`,
  },
  {
    label: 'Entire Agreement',
    html: `<h2>10. Entire Agreement</h2><p>This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements. Any amendments must be in writing and signed by both parties.</p>`,
  },
];

const SIGNATURE_BLOCK = `<p>&nbsp;</p><p>Signed and agreed by the parties on the dates written below:</p><table style="border-collapse:collapse;width:100%;margin-top:32px;"><tr><td style="border:none;padding:8px;width:45%;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">[EMPLOYER REPRESENTATIVE NAME]</div><div style="font-size:10pt;color:#555;margin-top:2px;">Name</div></td><td style="border:none;width:10%;"></td><td style="border:none;padding:8px;width:45%;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">[EMPLOYEE NAME]</div><div style="font-size:10pt;color:#555;margin-top:2px;">Name</div></td></tr><tr><td style="border:none;padding:8px;padding-top:24px;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">&nbsp;</div><div style="font-size:10pt;color:#555;margin-top:2px;">Signature</div></td><td style="border:none;"></td><td style="border:none;padding:8px;padding-top:24px;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">&nbsp;</div><div style="font-size:10pt;color:#555;margin-top:2px;">Signature</div></td></tr><tr><td style="border:none;padding:8px;padding-top:24px;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">&nbsp;</div><div style="font-size:10pt;color:#555;margin-top:2px;">Title / Date</div></td><td style="border:none;"></td><td style="border:none;padding:8px;padding-top:24px;vertical-align:bottom;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">&nbsp;</div><div style="font-size:10pt;color:#555;margin-top:2px;">Title / Date</div></td></tr></table>`;

// ── Component ────────────────────────────────────────────────────────────────

interface EditorProps {
  htmlContent: string;
  onChange: (htmlContent: string) => void;
  tags: Tag[];
  placeholder?: string;
}

const FONT_SIZES = ['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt','28pt','36pt','48pt','72pt'];
const LINE_HEIGHTS = ['1.0','1.15','1.5','2.0','2.5','3.0'];
const COLORS = [
  '#000000','#1F2937','#374151','#6B7280','#9CA3AF','#D1D5DB','#FFFFFF',
  '#DC2626','#EA580C','#D97706','#65A30D','#16A34A','#0891B2','#2563EB',
  '#7C3AED','#DB2777','#BE185D','#166534','#1E3A5F','#78350F','#7F1D1D',
];

const Editor: React.FC<EditorProps> = ({ htmlContent, onChange, tags, placeholder }) => {
  const { t } = useTranslation();
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      FontFamily,
      FontSize.configure({ types: ['textStyle'] }),
      LineHeight.configure({ types: ['heading', 'paragraph'] }),
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TagPlaceholder,
      CharacterCount,
      Placeholder.configure({ placeholder: placeholder ?? t('editor.placeholder') }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external content changes (e.g. loading a saved section)
  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      editor.commands.setContent(htmlContent, false);
    }
  }, [htmlContent, editor]);

  if (!editor) return null;

  const cmd = () => editor.chain().focus();
  const inTable = editor.isActive('table');

  const insertTag = (tag: Tag) => {
    (cmd() as any).insertTag(tag.name).run();
    setShowTagMenu(false);
    setTagSearchQuery('');
  };

  const insertLink = () => {
    const url = prompt(t('editor.linkUrlPrompt'));
    if (url) cmd().setLink({ href: url }).run();
  };

  const insertImage = () => {
    const url = prompt(t('editor.imageUrlPrompt'));
    if (url) cmd().setImage({ src: url }).run();
  };

  const insertTable = () =>
    cmd().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const insertPageBreak = () =>
    cmd().insertContent('<div style="page-break-before:always;" class="page-break"><p></p></div>').run();

  const applyFontSize = (size: string) =>
    (cmd() as any).setFontSize(size).run();

  const applyLineHeight = (lh: string) =>
    (cmd() as any).setLineHeight(lh).run();

  const insertTemplate = (html: string) => {
    cmd().insertContent(html).run();
    setShowTemplatePicker(false);
  };

  const getGroupedTags = () => {
    const filtered = tags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
      tag.description.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
      (tag.context?.name || '').toLowerCase().includes(tagSearchQuery.toLowerCase())
    );
    return filtered.reduce((groups, tag) => {
      const ctx = tag.context?.name || t('editor.noContext');
      if (!groups[ctx]) groups[ctx] = [];
      groups[ctx].push(tag);
      return groups;
    }, {} as Record<string, Tag[]>);
  };

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const groupedTags = getGroupedTags();

  return (
    <div className="glass-card flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-white/80 sticky top-0 z-10">

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => cmd().undo().run()} disabled={!editor.can().undo()} className="h-8 w-8 p-0" title={t('editor.undo')}><Undo className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().redo().run()} disabled={!editor.can().redo()} className="h-8 w-8 p-0" title={t('editor.redo')}><Redo className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Font Family */}
        <Select onValueChange={v => cmd().setFontFamily(v).run()}>
          <SelectTrigger className="w-28 h-8 text-xs bg-white border-gray-200">
            <SelectValue placeholder={t('editor.fontFamily')} />
          </SelectTrigger>
          <SelectContent>
            {['Arial','Times New Roman','Courier New','Helvetica','Georgia','Verdana','Tahoma','Calibri'].map(f => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={applyFontSize}>
          <SelectTrigger className="w-16 h-8 text-xs bg-white border-gray-200">
            <SelectValue placeholder="12pt" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Heading Style */}
        <Select
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('heading', { level: 4 }) ? 'h4' :
            editor.isActive('heading', { level: 5 }) ? 'h5' :
            editor.isActive('heading', { level: 6 }) ? 'h6' : 'p'
          }
          onValueChange={v => {
            if (v === 'p') cmd().setParagraph().run();
            else cmd().setHeading({ level: parseInt(v[1]) as 1|2|3|4|5|6 }).run();
          }}
        >
          <SelectTrigger className="w-24 h-8 text-xs bg-white border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">{t('editor.styleNormal')}</SelectItem>
            <SelectItem value="h1" className="font-bold text-2xl leading-tight">{t('editor.styleH1')}</SelectItem>
            <SelectItem value="h2" className="font-bold text-xl leading-tight">{t('editor.styleH2')}</SelectItem>
            <SelectItem value="h3" className="font-bold text-lg leading-tight">{t('editor.styleH3')}</SelectItem>
            <SelectItem value="h4" className="font-semibold">{t('editor.styleH4')}</SelectItem>
            <SelectItem value="h5">{t('editor.styleH5')}</SelectItem>
            <SelectItem value="h6" className="text-sm">{t('editor.styleH6')}</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Basic formatting */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleBold().run()} className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`} title={t('editor.bold')}><Bold className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleItalic().run()} className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`} title={t('editor.italic')}><Italic className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleUnderline().run()} className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`} title={t('editor.underline')}><UnderlineIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleStrike().run()} className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`} title={t('editor.strikethrough')}><Strikethrough className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleSubscript().run()} className={`h-8 w-8 p-0 ${editor.isActive('subscript') ? 'bg-gray-200' : ''}`} title={t('editor.subscript')}><SubscriptIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleSuperscript().run()} className={`h-8 w-8 p-0 ${editor.isActive('superscript') ? 'bg-gray-200' : ''}`} title={t('editor.superscript')}><SuperscriptIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleCode().run()} className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-gray-200' : ''}`} title={t('editor.code')}><Code className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Colors */}
        <div className="flex items-center gap-0.5">
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('editor.textColor')}><Type className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2">
              <div className="text-xs text-gray-500 mb-1.5">{t('editor.textColor')}</div>
              <div className="grid grid-cols-7 gap-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => { cmd().setColor(c).run(); setShowColorPicker(false); }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <button onClick={() => { cmd().unsetColor().run(); setShowColorPicker(false); }} className="mt-2 text-xs text-gray-500 hover:text-gray-900 w-full text-left">Remove color</button>
            </PopoverContent>
          </Popover>

          <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('editor.highlight')}><Highlighter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2">
              <div className="text-xs text-gray-500 mb-1.5">{t('editor.highlight')}</div>
              <div className="grid grid-cols-7 gap-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => { cmd().toggleHighlight({ color: c }).run(); setShowHighlightPicker(false); }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <button onClick={() => { cmd().unsetHighlight().run(); setShowHighlightPicker(false); }} className="mt-2 text-xs text-gray-500 hover:text-gray-900 w-full text-left">Remove highlight</button>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => cmd().setTextAlign('left').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`} title={t('editor.alignLeft')}><AlignLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().setTextAlign('center').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`} title={t('editor.alignCenter')}><AlignCenter className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().setTextAlign('right').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`} title={t('editor.alignRight')}><AlignRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().setTextAlign('justify').run()} className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`} title={t('editor.justify')}><AlignJustify className="w-4 h-4" /></Button>
        </div>

        {/* Line Spacing */}
        <Select onValueChange={applyLineHeight}>
          <SelectTrigger className="w-16 h-8 text-xs bg-white border-gray-200" title="Line spacing">
            <SelectValue placeholder="≡" />
          </SelectTrigger>
          <SelectContent>
            {LINE_HEIGHTS.map(lh => <SelectItem key={lh} value={lh}>{lh}</SelectItem>)}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Lists & indent */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleBulletList().run()} className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`} title={t('editor.bulletList')}><List className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleOrderedList().run()} className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`} title={t('editor.numberedList')}><ListOrdered className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().sinkListItem('listItem').run()} className="h-8 w-8 p-0" title={t('editor.indent')}><IndentIncrease className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().liftListItem('listItem').run()} className="h-8 w-8 p-0" title={t('editor.outdent')}><IndentDecrease className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Insert elements */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={insertLink} className="h-8 w-8 p-0" title={t('editor.insertLink')}><LinkIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={insertImage} className="h-8 w-8 p-0" title={t('editor.insertImage')}><ImageIcon className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().toggleBlockquote().run()} className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`} title={t('editor.quote')}><Quote className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => cmd().setHorizontalRule().run()} className="h-8 w-8 p-0" title="Horizontal rule"><Minus className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={insertPageBreak} className="h-8 w-8 p-0" title="Page break">
            <span className="text-[10px] font-bold leading-none">PB</span>
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Table insert */}
        <Button variant="ghost" size="sm" onClick={insertTable} className="h-8 w-8 p-0" title={t('editor.insertTable')}><TableIcon className="w-4 h-4" /></Button>

        {/* Table context controls — only when cursor is inside a table */}
        {inTable && (
          <>
            <Separator orientation="vertical" className="h-6 bg-orange-200" />
            <div className="flex items-center gap-0.5 bg-orange-50 rounded px-1 py-0.5" title="Table editing">
              <Button variant="ghost" size="sm" onClick={() => cmd().addRowBefore().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Add row above">
                <span className="text-[9px] font-bold">↑R+</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().addRowAfter().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Add row below">
                <span className="text-[9px] font-bold">↓R+</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().deleteRow().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Delete row">
                <span className="text-[9px] font-bold">R×</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().addColumnBefore().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Add column left">
                <span className="text-[9px] font-bold">←C+</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().addColumnAfter().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Add column right">
                <span className="text-[9px] font-bold">→C+</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().deleteColumn().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Delete column">
                <span className="text-[9px] font-bold">C×</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().mergeCells().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Merge cells">
                <span className="text-[9px] font-bold">M</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().splitCell().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Split cell">
                <span className="text-[9px] font-bold">S</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().toggleHeaderRow().run()} className="h-7 w-7 p-0 text-orange-700 hover:bg-orange-100" title="Toggle header row">
                <span className="text-[9px] font-bold">H</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => cmd().deleteTable().run()} className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" title="Delete table">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Signature block */}
        <Button variant="ghost" size="sm" onClick={() => cmd().insertContent(SIGNATURE_BLOCK).run()} className="h-8 px-2 text-xs gap-1" title="Insert signature block">
          <PenLine className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign</span>
        </Button>

        {/* Section templates */}
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(!showTemplatePicker)} className="h-8 px-2 text-xs gap-1" title="Insert section template">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          {showTemplatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-64 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">Contract Sections</div>
              {CONTRACT_TEMPLATES.map(tpl => (
                <button key={tpl.label} onClick={() => insertTemplate(tpl.html)} className="block w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-800 border-b border-gray-100 last:border-0 transition-colors">
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 bg-gray-200" />

        {/* Dynamic tag insertion */}
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowTagMenu(!showTagMenu)} className="h-8 px-2 text-xs gap-1" title={t('editor.insertTags')}>
            <Type className="w-3.5 h-3.5" />
            {t('editor.insertTags')}
          </Button>
          {showTagMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 min-w-80 max-h-96 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input type="text" placeholder={t('editor.searchTags')} value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className="pl-10 h-8 text-sm" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {Object.keys(groupedTags).length > 0 ? (
                  Object.entries(groupedTags).map(([ctx, ctxTags]) => (
                    <div key={ctx}>
                      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 font-semibold text-xs text-gray-700 uppercase tracking-wide">{ctx}</div>
                      {ctxTags.map(tag => (
                        <button key={tag.id} onClick={() => insertTag(tag)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                          <div className="font-medium text-gray-800">#{tag.name}#</div>
                          <div className="text-xs text-gray-500">{tag.description}</div>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    {tagSearchQuery ? t('editor.noTagsFound') : t('editor.noTagsRegistered')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor canvas ── */}
      <div className="p-4 bg-gray-100 flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="tiptap-editor mx-auto bg-white shadow-lg"
        />
      </div>

      {/* ── Footer: word / char count ── */}
      <div className="flex items-center justify-end gap-4 px-4 py-1.5 border-t border-gray-200 bg-white/80 text-xs text-gray-400">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
};

export default Editor;
