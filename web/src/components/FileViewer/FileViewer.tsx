import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { IoMdClose} from 'react-icons/io';
import { MdFilePresent } from 'react-icons/md';

interface FileData {
  blob: Blob;
  contentType: string;
  fileName: string;
}

interface FileViewerProps {
  filePath: string | null;
  onClose?: () => void;
}

const FileViewer = ({ filePath, onClose }: FileViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;

    let isMounted = true;
    let currentObjectUrl: string | null = null;

    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axiosInstance.get(`/raw/${encodeURIComponent(filePath.slice(1))}`, {
          responseType: 'blob',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          params: { _t: Date.now() },
        });

        if (!isMounted) return;

        if (objectUrl) URL.revokeObjectURL(objectUrl);

        const contentDisposition = response.headers['content-disposition'];
        let fileName = filePath.split('/').pop() || 'file';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) fileName = match[1].replace(/['"]/g, '');
        }

        const url = URL.createObjectURL(response.data);
        currentObjectUrl = url;
        setObjectUrl(url);
        setFileData({ blob: response.data, contentType: response.headers['content-type'], fileName });
      } catch (err) {
        if (isMounted) {
          setError('Failed to load file. Please check your permissions or try again.');
          console.error('File loading error:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFile();

    return () => {
      isMounted = false;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [filePath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!filePath) return null;

  const handleDownload = () => {
    if (!objectUrl || !fileData) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileName = fileData?.fileName ?? filePath.split('/').pop() ?? 'File';

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
          <span className="text-sm">Loading file...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
          <MdFilePresent size={48} className="opacity-40" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      );
    }

    if (!fileData || !objectUrl) return null;

    const { contentType } = fileData;

    if (contentType === 'application/pdf') {
      return (
        <iframe
          src={objectUrl}
          title="PDF Viewer"
          className="flex-1 w-full rounded-lg border border-gray-600 bg-gray-900"
          style={{ minHeight: 0 }}
        />
      );
    }

    if (contentType.startsWith('image/')) {
      return (
        <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-900 rounded-lg border border-gray-600 p-4">
          <img
            src={objectUrl}
            alt="File preview"
            className="max-w-full max-h-full object-contain rounded"
            style={{ maxHeight: '60vh' }}
          />
        </div>
      );
    }

    if (contentType.startsWith('video/')) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-600 p-4">
          <video
            controls
            className="max-w-full rounded"
            style={{ maxHeight: '60vh' }}
          >
            <source src={objectUrl} type={contentType} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (contentType.startsWith('audio/')) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gray-900 rounded-lg border border-gray-600 p-8">
          <div className="p-6 bg-gray-800 rounded-full border-2 border-gray-600">
            <MdFilePresent size={48} className="text-sky-400" />
          </div>
          <p className="text-gray-300 font-medium truncate max-w-xs text-center">{fileName}</p>
          <audio controls className="w-full max-w-md">
            <source src={objectUrl} type={contentType} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900 rounded-lg border border-gray-600 p-8 text-gray-400">
        <MdFilePresent size={48} className="opacity-40" />
        <p className="text-sm text-center">
          File type <span className="text-gray-300 font-mono text-xs bg-gray-700 px-2 py-0.5 rounded">{contentType}</span> cannot be previewed in the browser.
        </p>
      </div>
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Modal */}
      <div
        className="flex flex-col bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-auto"
        style={{ height: '85vh', maxHeight: '900px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-sky-500 rounded-lg flex-shrink-0">
              <MdFilePresent size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base truncate">{fileName}</h2>
              <p className="text-gray-400 text-xs truncate">{filePath}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center p-2 bg-gray-700 hover:bg-red-600 text-white rounded-lg transition-colors border-2 border-gray-700 hover:border-red-600"
                title="Close"
              >
                <IoMdClose size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-4 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;