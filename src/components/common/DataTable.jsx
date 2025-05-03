import React from 'react';
import {
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CSpinner,
    CAlert,
    CPagination,
    CPaginationItem
} from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 通用数据表格组件
 * 支持分页、排序、加载状态和空数据状态
 */
const DataTable = ({
    columns,
    data,
    loading = false,
    error = null,
    sortable = false,
    sortField = null,
    sortDirection = 'asc',
    onSort = null,
    pagination = false,
    page = 1,
    totalPages = 1,
    onPageChange = null,
    emptyText = '暂无数据',
    rowKey = 'id',
    rowClassName = null,
    className = '',
    ...props
}) => {
    // 处理排序点击事件
    const handleSortClick = (field) => {
        if (!sortable || !onSort) return;

        // 如果点击相同列，则切换排序方向，否则使用默认方向
        const direction = field === sortField
            ? sortDirection === 'asc' ? 'desc' : 'asc'
            : 'asc';

        onSort(field, direction);
    };

    // 处理页码点击事件
    const handlePageClick = (page) => {
        if (!pagination || !onPageChange || page < 1 || page > totalPages) return;
        onPageChange(page);
    };

    // 渲染表头
    const renderTableHead = () => (
        <CTableHead color="light">
            <CTableRow>
                {columns.map((column) => (
                    <CTableHeaderCell
                        key={column.key}
                        className={`${column.headerClassName || ''} ${sortable && column.sortable ? 'cursor-pointer' : ''}`}
                        onClick={() => sortable && column.sortable && handleSortClick(column.key)}
                        scope="col"
                        style={column.width ? { width: column.width } : {}}
                    >
                        {column.title}
                        {sortable && column.sortable && sortField === column.key && (
                            <span className="ms-1">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                        )}
                    </CTableHeaderCell>
                ))}
            </CTableRow>
        </CTableHead>
    );

    // 渲染表格内容
    const renderTableBody = () => {
        if (loading) {
            return (
                <CTableBody>
                    <CTableRow>
                        <CTableDataCell colSpan={columns.length} className="text-center py-5">
                            <CSpinner color="primary" className="me-2" />
                            <span>加载中...</span>
                        </CTableDataCell>
                    </CTableRow>
                </CTableBody>
            );
        }

        if (error) {
            return (
                <CTableBody>
                    <CTableRow>
                        <CTableDataCell colSpan={columns.length} className="p-0 border-0">
                            <CAlert color="danger" className="mb-0">
                                {error}
                            </CAlert>
                        </CTableDataCell>
                    </CTableRow>
                </CTableBody>
            );
        }

        if (!data || data.length === 0) {
            return (
                <CTableBody>
                    <CTableRow>
                        <CTableDataCell colSpan={columns.length} className="text-center text-muted py-5">
                            {emptyText}
                        </CTableDataCell>
                    </CTableRow>
                </CTableBody>
            );
        }

        return (
            <CTableBody>
                {data.map((item, index) => (
                    <CTableRow
                        key={item[rowKey] || index}
                        className={rowClassName ? rowClassName(item, index) : ''}
                    >
                        {columns.map((column) => (
                            <CTableDataCell
                                key={`${item[rowKey] || index}-${column.key}`}
                                className={column.className || ''}
                            >
                                {column.render
                                    ? column.render(item[column.dataIndex], item, index)
                                    : item[column.dataIndex]
                                }
                            </CTableDataCell>
                        ))}
                    </CTableRow>
                ))}
            </CTableBody>
        );
    };

    // 渲染分页
    const renderPagination = () => {
        if (!pagination || totalPages <= 1) return null;

        return (
            <CPagination className="mt-3 justify-content-center" aria-label="Page navigation">
                <CPaginationItem
                    aria-label="Previous"
                    disabled={page <= 1}
                    onClick={() => handlePageClick(page - 1)}
                >
                    <span aria-hidden="true">&laquo;</span>
                </CPaginationItem>

                {/* 生成页码按钮 */}
                {[...Array(totalPages)].map((_, i) => {
                    const pageNumber = i + 1;
                    // 显示逻辑：显示首页、尾页、当前页及其前后两页
                    if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= page - 1 && pageNumber <= page + 1)
                    ) {
                        return (
                            <CPaginationItem
                                key={pageNumber}
                                active={pageNumber === page}
                                onClick={() => handlePageClick(pageNumber)}
                            >
                                {pageNumber}
                            </CPaginationItem>
                        );
                    }

                    // 如果是省略号位置（当前页-2或当前页+2）
                    if (pageNumber === page - 2 || pageNumber === page + 2) {
                        return <CPaginationItem key={pageNumber} disabled>...</CPaginationItem>;
                    }

                    return null;
                })}

                <CPaginationItem
                    aria-label="Next"
                    disabled={page >= totalPages}
                    onClick={() => handlePageClick(page + 1)}
                >
                    <span aria-hidden="true">&raquo;</span>
                </CPaginationItem>
            </CPagination>
        );
    };

    return (
        <div className={className}>
            <CTable hover={data && data.length > 0} responsive {...props}>
                {renderTableHead()}
                {renderTableBody()}
            </CTable>
            {renderPagination()}
        </div>
    );
};

DataTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        title: PropTypes.node.isRequired,
        dataIndex: PropTypes.string.isRequired,
        render: PropTypes.func,
        width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        className: PropTypes.string,
        headerClassName: PropTypes.string,
        sortable: PropTypes.bool
    })).isRequired,
    data: PropTypes.array,
    loading: PropTypes.bool,
    error: PropTypes.string,
    sortable: PropTypes.bool,
    sortField: PropTypes.string,
    sortDirection: PropTypes.oneOf(['asc', 'desc']),
    onSort: PropTypes.func,
    pagination: PropTypes.bool,
    page: PropTypes.number,
    totalPages: PropTypes.number,
    onPageChange: PropTypes.func,
    emptyText: PropTypes.node,
    rowKey: PropTypes.string,
    rowClassName: PropTypes.func,
    className: PropTypes.string
};

export default DataTable;