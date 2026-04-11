import React, { useRef, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Table, Type, Palette,
  Search, Quote, Link, Code, Subscript, Superscript,
  IndentIncrease, IndentDecrease, Undo, Redo, Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag } from '@/types';
import { useTranslation } from 'react-i18next';

interface EditorProps {
  htmlContent: string;
  onChange: (htmlContent: string) => void;
  tags: Tag[];
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ htmlContent, onChange, tags, placeholder }) => {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const effectivePlaceholder = placeholder ?? t('editor.placeholder');

  useEffect(() => {
    if (editorRef.current && htmlContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertTag = (tag: Tag) => {
    const tagHtml = `<span class="tag-placeholder" data-tag="${tag.name}">#${tag.name}#</span>&nbsp;`;
    execCommand('insertHTML', tagHtml);
    setShowTagMenu(false);
    setTagSearchQuery('');
  };

  const insertTable = () => {
    const h = t('editor.tableHeader');
    const c = t('editor.tableCell');
    const tableHtml = `
      <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
        <tr>
          <th style="border: 1px solid #ccc; padding: 8px; background: rgba(0,0,0,0.1);">${h} 1</th>
          <th style="border: 1px solid #ccc; padding: 8px; background: rgba(0,0,0,0.1);">${h} 2</th>
          <th style="border: 1px solid #ccc; padding: 8px; background: rgba(0,0,0,0.1);">${h} 3</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 1</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 2</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 3</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 4</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 5</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${c} 6</td>
        </tr>
      </table>
    `;
    execCommand('insertHTML', tableHtml);
  };

  const insertImage = () => {
    const url = prompt(t('editor.imageUrlPrompt'));
    if (url) execCommand('insertImage', url);
  };

  const insertLink = () => {
    const url = prompt(t('editor.linkUrlPrompt'));
    if (url) execCommand('createLink', url);
  };

  const insertQuote = () => execCommand('formatBlock', 'blockquote');
  const handleFontFamily = (fontFamily: string) => execCommand('fontName', fontFamily);
  const handleFontSize = (fontSize: string) => execCommand('fontSize', fontSize);
  const handleHeading = (heading: string) => execCommand('formatBlock', heading);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080',
    '#FFFFFF', '#FFA500', '#A52A2A', '#DDA0DD', '#90EE90', '#FFB6C1', '#87CEEB'
  ];

  const getGroupedTags = () => {
    const filteredTags = tags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
      tag.description.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
      (tag.context?.name || '').toLowerCase().includes(tagSearchQuery.toLowerCase())
    );
    return filteredTags.reduce((groups, tag) => {
      const contextName = tag.context?.name || t('editor.noContext');
      if (!groups[contextName]) groups[contextName] = [];
      groups[contextName].push(tag);
      return groups;
    }, {} as Record<string, Tag[]>);
  };

  const groupedTags = getGroupedTags();

  return (
    <div className="glass-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200">

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => execCommand('undo')} className="h-8 w-8 p-0" title={t('editor.undo')}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('redo')} className="h-8 w-8 p-0" title={t('editor.redo')}>
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Font Family */}
        <Select onValueChange={handleFontFamily}>
          <SelectTrigger className="w-32 h-8 glass bg-white border-gray-200 text-sm">
            <SelectValue placeholder={t('editor.fontFamily')} />
          </SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times</SelectItem>
            <SelectItem value="Courier New">Courier</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Tahoma">Tahoma</SelectItem>
            <SelectItem value="Impact">Impact</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={handleFontSize}>
          <SelectTrigger className="w-16 h-8 glass bg-white border-gray-200 text-sm">
            <SelectValue placeholder="12" />
          </SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            <SelectItem value="1">8pt</SelectItem>
            <SelectItem value="2">10pt</SelectItem>
            <SelectItem value="3">12pt</SelectItem>
            <SelectItem value="4">14pt</SelectItem>
            <SelectItem value="5">18pt</SelectItem>
            <SelectItem value="6">24pt</SelectItem>
            <SelectItem value="7">36pt</SelectItem>
          </SelectContent>
        </Select>

        {/* Headings */}
        <Select onValueChange={handleHeading}>
          <SelectTrigger className="w-24 h-8 glass bg-white border-gray-200 text-sm">
            <SelectValue placeholder={t('editor.style')} />
          </SelectTrigger>
          <SelectContent className="glass-strong border-gray-200">
            <SelectItem value="div">{t('editor.styleNormal')}</SelectItem>
            <SelectItem value="h1">{t('editor.styleH1')}</SelectItem>
            <SelectItem value="h2">{t('editor.styleH2')}</SelectItem>
            <SelectItem value="h3">{t('editor.styleH3')}</SelectItem>
            <SelectItem value="h4">{t('editor.styleH4')}</SelectItem>
            <SelectItem value="h5">{t('editor.styleH5')}</SelectItem>
            <SelectItem value="h6">{t('editor.styleH6')}</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Basic Formatting */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => execCommand('bold')} className="h-8 w-8 p-0" title={t('editor.bold')}><Bold className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('italic')} className="h-8 w-8 p-0" title={t('editor.italic')}><Italic className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('underline')} className="h-8 w-8 p-0" title={t('editor.underline')}><Underline className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('strikeThrough')} className="h-8 w-8 p-0" title={t('editor.strikethrough')}><Strikethrough className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Advanced Formatting */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => execCommand('subscript')} className="h-8 w-8 p-0" title={t('editor.subscript')}><Subscript className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('superscript')} className="h-8 w-8 p-0" title={t('editor.superscript')}><Superscript className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('insertHTML', '<code></code>')} className="h-8 w-8 p-0" title={t('editor.code')}><Code className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('editor.textColor')}><Type className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 glass-strong border-gray-200">
              <div className="grid grid-cols-7 gap-1">
                {colors.map((color) => (
                  <button key={color} onClick={() => { execCommand('foreColor', color); setShowColorPicker(false); }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t('editor.highlight')}><Highlighter className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 glass-strong border-gray-200">
              <div className="grid grid-cols-7 gap-1">
                {colors.map((color) => (
                  <button key={color} onClick={() => { execCommand('backColor', color); setShowHighlightPicker(false); }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Alignment */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => execCommand('justifyLeft')} className="h-8 w-8 p-0" title={t('editor.alignLeft')}><AlignLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('justifyCenter')} className="h-8 w-8 p-0" title={t('editor.alignCenter')}><AlignCenter className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('justifyRight')} className="h-8 w-8 p-0" title={t('editor.alignRight')}><AlignRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('justifyFull')} className="h-8 w-8 p-0" title={t('editor.justify')}><AlignJustify className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Lists and Indentation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => execCommand('insertUnorderedList')} className="h-8 w-8 p-0" title={t('editor.bulletList')}><List className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('insertOrderedList')} className="h-8 w-8 p-0" title={t('editor.numberedList')}><ListOrdered className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('indent')} className="h-8 w-8 p-0" title={t('editor.indent')}><IndentIncrease className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => execCommand('outdent')} className="h-8 w-8 p-0" title={t('editor.outdent')}><IndentDecrease className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Insert Elements */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={insertLink} className="h-8 w-8 p-0" title={t('editor.insertLink')}><Link className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={insertImage} className="h-8 w-8 p-0" title={t('editor.insertImage')}><Image className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={insertTable} className="h-8 w-8 p-0" title={t('editor.insertTable')}><Table className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={insertQuote} className="h-8 w-8 p-0" title={t('editor.quote')}><Quote className="w-4 h-4" /></Button>
        </div>

        <Separator orientation="vertical" className="h-6 bg-white/20" />

        {/* Dynamic tags grouped by context */}
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowTagMenu(!showTagMenu)} className="h-8 px-3 text-sm" title={t('editor.insertTags')}>
            <Type className="w-4 h-4 mr-1" />
            {t('editor.insertTags')}
          </Button>

          {showTagMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 min-w-80 max-h-96 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-300 bg-gray-50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('editor.searchTags')}
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="pl-10 h-8 bg-white border-gray-300 text-gray-900 placeholder-gray-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white">
                {Object.keys(groupedTags).length > 0 ? (
                  Object.entries(groupedTags).map(([contextName, contextTags]) => (
                    <div key={contextName} className="mb-2">
                      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 font-semibold text-sm text-gray-800">
                        {contextName}
                      </div>
                      <div className="pb-2">
                        {contextTags.map((tag) => (
                          <button key={tag.id} onClick={() => insertTag(tag)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-900">
                            <div className="font-medium text-gray-800">#{tag.name}#</div>
                            <div className="text-xs text-gray-600">{tag.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {tagSearchQuery ? t('editor.noTagsFound') : t('editor.noTagsRegistered')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-4 bg-gray-50">
        <div
          ref={editorRef}
          className="min-h-[600px] max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-sm border border-gray-200 focus:outline-none text-black"
          style={{
            minHeight: '29.7cm',
            width: '21cm',
            maxWidth: '21cm',
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: '1.6'
          }}
          contentEditable
          onInput={handleContentChange}
          onBlur={handleContentChange}
          data-placeholder={effectivePlaceholder}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};

export default Editor;
