import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EmptyState from './EmptyState';

/**
 * Reusable DataTable component with search, pagination, sorting, and hover actions
 *
 * @param {Array} columns - Column definitions: { id, label, align, sortable, render, width }
 * @param {Array} data - Array of row data objects
 * @param {Function} getRowId - Function to get unique row id (default: row => row.id)
 * @param {string} searchPlaceholder - Placeholder text for search input
 * @param {Array} searchFields - Fields to search in (default: all string fields)
 * @param {Function} renderRowActions - Function to render row actions: (row) => ReactNode
 * @param {boolean} showSearch - Whether to show search bar (default: true)
 * @param {boolean} showPagination - Whether to show pagination (default: true)
 * @param {number} defaultRowsPerPage - Default rows per page (default: 10)
 * @param {Array} rowsPerPageOptions - Options for rows per page (default: [5, 10, 25])
 * @param {object} emptyState - Empty state config: { icon, title, description, actionLabel, onAction }
 * @param {Function} onRowClick - Optional row click handler
 * @param {Function} getRowStyle - Optional function to get row style: (row) => sx object
 */
export default function DataTable({
  columns,
  data = [],
  getRowId = (row) => row.id,
  searchPlaceholder = 'Search...',
  searchFields,
  renderRowActions,
  showSearch = true,
  showPagination = true,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25],
  emptyState = {},
  onRowClick,
  getRowStyle,
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  const [hoveredRow, setHoveredRow] = useState(null);

  // Determine searchable fields
  const searchableFields = useMemo(() => {
    if (searchFields) return searchFields;
    if (data.length === 0) return [];
    // Default: all string/number fields from first row
    return Object.keys(data[0]).filter((key) => {
      const val = data[0][key];
      return typeof val === 'string' || typeof val === 'number';
    });
  }, [data, searchFields]);

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const searchLower = search.toLowerCase();
    return data.filter((row) =>
      searchableFields.some((field) => {
        const val = row[field];
        if (val == null) return false;
        return String(val).toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, searchableFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return order === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, orderBy, order]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage, showPagination]);

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(0);
  };

  // Reset page when search changes
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const isEmpty = data.length === 0;
  const isFiltered = filteredData.length === 0 && data.length > 0;

  return (
    <Box>
      {/* Search Bar */}
      {showSearch && (
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearchChange}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{ width: column.width }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {renderRowActions && (
                <TableCell align="right" sx={{ width: 100 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  sx={{ border: 0 }}
                >
                  <EmptyState
                    icon={emptyState.icon}
                    title={emptyState.title || 'No data'}
                    description={emptyState.description}
                    actionLabel={emptyState.actionLabel}
                    onAction={emptyState.onAction}
                  />
                </TableCell>
              </TableRow>
            ) : isFiltered ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  sx={{ border: 0 }}
                >
                  <EmptyState
                    title="No results found"
                    description={`No items match "${search}". Try a different search term.`}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const rowId = getRowId(row);
                const isHovered = hoveredRow === rowId;
                const rowStyle = getRowStyle ? getRowStyle(row) : {};

                return (
                  <TableRow
                    key={rowId}
                    hover
                    onMouseEnter={() => setHoveredRow(rowId)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(row)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      ...rowStyle,
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {column.render
                          ? column.render(row[column.id], row)
                          : row[column.id]}
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell align="right">
                        <Box
                          sx={{
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.15s',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                          }}
                        >
                          {renderRowActions(row)}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && !isEmpty && (
        <TablePagination
          component="div"
          count={filteredData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiTablePagination-toolbar': {
              minHeight: 52,
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.8125rem',
            },
          }}
        />
      )}
    </Box>
  );
}
