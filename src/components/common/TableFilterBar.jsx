import React from 'react';
import PropTypes from 'prop-types';
import {
    CRow,
    CCol,
    CInputGroup,
    CFormInput,
    CFormSelect,
    CButton
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilFilterX } from '@coreui/icons';

/**
 * 通用表格筛选组件
 * 提供搜索、状态筛选、环境筛选等功能
 */
const TableFilterBar = ({
    searchText = '',
    onSearchChange,
    currentStatusFilter = 'all',
    onStatusFilterChange,
    statusOptions = [],
    condaEnvFilter = 'all',
    onCondaEnvFilterChange,
    condaEnvOptions = [],
    onClearFilters,
    hasActiveFilters = false,
    className = '',
    showCondaFilter = true,
    filterBarLayout = { searchWidth: 300, selectWidth: 180 }
}) => {
    return (
        <CRow className={`mb-3 ${className}`}>
            <CCol md={12} lg={8} className="d-flex flex-wrap gap-3 mb-3 mb-lg-0">
                {/* 搜索框 */}
                <CInputGroup style={{ maxWidth: `${filterBarLayout.searchWidth}px` }}>
                    <CFormInput
                        placeholder="搜索..."
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </CInputGroup>

                {/* 状态筛选下拉框 */}
                {statusOptions.length > 0 && (
                    <CFormSelect
                        style={{ width: `${filterBarLayout.selectWidth}px` }}
                        value={currentStatusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                    >
                        {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </CFormSelect>
                )}

                {/* 环境筛选下拉框 */}
                {showCondaFilter && condaEnvOptions.length > 1 && (
                    <CFormSelect
                        style={{ width: `${filterBarLayout.selectWidth}px` }}
                        value={condaEnvFilter}
                        onChange={(e) => onCondaEnvFilterChange(e.target.value)}
                    >
                        {condaEnvOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </CFormSelect>
                )}

                {/* 清除筛选按钮 */}
                {hasActiveFilters && (
                    <CButton
                        color="link"
                        className="p-0 text-decoration-none"
                        onClick={onClearFilters}
                    >
                        <CIcon icon={cilFilterX} className="me-1" />
                        清除过滤器
                    </CButton>
                )}
            </CCol>
        </CRow>
    );
};

TableFilterBar.propTypes = {
    searchText: PropTypes.string,
    onSearchChange: PropTypes.func.isRequired,
    currentStatusFilter: PropTypes.string,
    onStatusFilterChange: PropTypes.func.isRequired,
    statusOptions: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired
    })),
    condaEnvFilter: PropTypes.string,
    onCondaEnvFilterChange: PropTypes.func,
    condaEnvOptions: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired
    })),
    onClearFilters: PropTypes.func.isRequired,
    hasActiveFilters: PropTypes.bool,
    className: PropTypes.string,
    showCondaFilter: PropTypes.bool,
    filterBarLayout: PropTypes.shape({
        searchWidth: PropTypes.number,
        selectWidth: PropTypes.number
    })
};

export default TableFilterBar;