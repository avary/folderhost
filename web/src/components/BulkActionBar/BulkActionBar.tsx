import { useContext } from 'react';
import ExplorerContext from '../../utils/ExplorerContext';
import { FaTrash, FaCopy, FaArrowUp } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

interface BulkActionBarProps {
  onMoveToParent?: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ onMoveToParent }) => {
  const { 
    selectedItems, 
    clearSelection, 
    bulkDelete, 
    bulkCopy,
    isBulkActionLoading,
    permissions,
    path
  } = useContext(ExplorerContext);
  
  if (selectedItems.length < 2) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 px-3 py-2 flex items-center gap-2">
        <span className="text-gray-400 text-xs">
          {selectedItems.length}
        </span>
        
        <div className="w-px h-4 bg-gray-700 justify-center items-center" />
        
        {permissions?.delete && (
          <button
            onClick={bulkDelete}
            disabled={isBulkActionLoading}
            className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50 rounded transition-colors text-xs"
          >
            <FaTrash size={12} className="inline mr-1" />
            Delete
          </button>
        )}
        
        {permissions?.copy && (
          <button
            onClick={bulkCopy}
            disabled={isBulkActionLoading}
            className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50 rounded transition-colors text-xs"
          >
            <FaCopy size={12} className="inline mr-1" />
            Copy
          </button>
        )}
        
        {path !== "./" && onMoveToParent && (
          <button
            onClick={onMoveToParent}
            disabled={isBulkActionLoading}
            className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50 rounded transition-colors text-xs"
          >
            <FaArrowUp size={12} className="inline mr-1" />
            Move Up
          </button>
        )}
        
        <button
          onClick={clearSelection}
          disabled={isBulkActionLoading}
          className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50 rounded transition-colors text-xs"
        >
          <MdClose size={12} className="inline mr-1" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;