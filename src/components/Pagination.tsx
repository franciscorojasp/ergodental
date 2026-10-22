import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalItems === 0 || totalPages <= 1) {
    if (totalItems === 0) return null;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-light)',
      }}>
        <span>Total: <strong>{totalItems}</strong> registros</span>
      </div>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '12px 16px',
      borderTop: '1px solid var(--border-light)',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '0 0 var(--radius) var(--radius)',
      fontSize: '0.82rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Mostrando <strong>{startItem}-{endItem}</strong> de <strong>{totalItems}</strong></span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            <option value={10}>10 por pág.</option>
            <option value={20}>20 por pág.</option>
            <option value={50}>50 por pág.</option>
          </select>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '4px 10px',
            height: '30px',
            opacity: currentPage <= 1 ? 0.4 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ‹ Ant
        </button>

        <span style={{
          padding: '0 10px',
          fontWeight: 700,
          color: 'var(--primary)',
          fontSize: '0.82rem',
        }}>
          {currentPage} / {totalPages}
        </span>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '4px 10px',
            height: '30px',
            opacity: currentPage >= totalPages ? 0.4 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Sig ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;
