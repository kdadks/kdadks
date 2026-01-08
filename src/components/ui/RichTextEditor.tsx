import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

// Import TinyMCE and expose it globally
import tinymce from 'tinymce/tinymce';

// Make tinymce available globally
if (typeof window !== 'undefined') {
  (window as any).tinymce = tinymce;
}

// Import TinyMCE themes and plugins
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/models/dom';

// Import plugins
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';

// Import skins (CSS)
import 'tinymce/skins/ui/oxide/skin.min.css';

import type { Editor as TinyMCEEditor } from 'tinymce';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter details...',
  className = ''
}) => {
  const editorRef = useRef<TinyMCEEditor | null>(null);

  return (
    <div className={`rich-text-editor ${className}`}>
      <Editor
        tinymceScriptSrc={undefined} // Don't load from CDN, use imported tinymce
        licenseKey='gpl' // Use GPL license for open source
        onInit={(evt, editor) => editorRef.current = editor}
        value={value}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height: 400,
          menubar: false,
          statusbar: false, // Hide statusbar with "Alt+0 for help" message
          skin: false, // Use imported skin CSS
          content_css: false, // Don't load external content CSS
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'table | removeformat',
          content_style: `
            body { 
              font-family: Helvetica, Arial, sans-serif; 
              font-size: 14px;
              padding: 10px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 10px 0;
            }
            table td, table th {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            table th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            table tr:nth-child(even) {
              background-color: #f9fafb;
            }
          `,
          placeholder: placeholder,
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            'border-collapse': 'collapse',
            'width': '100%'
          },
          table_class_list: [
            { title: 'Default', value: 'table-default' },
            { title: 'Bordered', value: 'table-bordered' }
          ],
          // Enable table features
          table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
          table_resize_bars: true,
          table_style_by_css: true,
          // Additional settings for better UX
          branding: false,
          promotion: false,
          resize: true,
          // Default table structure
          table_default_rows: 3,
          table_default_cols: 3
        }}
      />
    </div>
  );
};

export default RichTextEditor;
