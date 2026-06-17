import React, { useState, useRef } from 'react';
import { Card, Row, Col, Select, Button, Space, Table, Divider, Modal, Typography, message } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { useGetEmployeeReportQuery, useGetPayrollReportQuery, useGetAssetReportQuery, useGetBranchesQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Report Print Template (printed on white, so uses light theme styling exclusively)
const ReportPrintContent = React.forwardRef(({ type, data, title, subtitle }, ref) => {
  if (!data || data.length === 0) return null;

  return (
    <div ref={ref} style={{ padding: 40, fontFamily: 'sans-serif', color: '#1f2937' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{title}</h2>
        <p style={{ margin: '4px 0', fontSize: 14, color: '#6b7280' }}>{subtitle}</p>
        <p style={{ margin: '2px 0', fontSize: 11, color: '#9ca3af' }}>Generated on: {new Date().toLocaleString()}</p>
      </div>

      <Divider style={{ margin: '12px 0', borderColor: '#d1d5db' }} />

      {type === 'employees' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Emp Code</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>CNIC</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Type</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Grade</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Basic Salary</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{item.EmpCode}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{item.FullName}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.CNIC}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.Type}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.Status}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.Grade}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.BasicSalary?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {type === 'payroll' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Code</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Basic (PKR)</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Allowances</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Tax</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Loan Paid</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{item.EmpCode}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{item.EmployeeName}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.BasicSalary?.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.Allowances?.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.TaxAmount?.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.LoanDeduction?.toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>{item.NetSalary?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {type === 'assets' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Asset Code</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Asset Name</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Category</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Serial No</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Assigned To</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e5e7eb' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{item.AssetCode}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{item.Name}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.Category}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.SerialNumber}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.Status}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.AssignedToEmployeeName || 'N/A'}</td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.Value?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
});

const Reports = () => {
  const { companyCode } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  
  const [reportType, setReportType] = useState('employees');
  const [branchCode, setBranchCode] = useState('');
  const [status, setStatus] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const { data: branches = [] } = useGetBranchesQuery(companyCode);
  
  const { data: employeeData = [] } = useGetEmployeeReportQuery({ branchCode, status }, { skip: reportType !== 'employees' });
  const { data: payrollData = [] } = useGetPayrollReportQuery({ year, month }, { skip: reportType !== 'payroll' });
  const { data: assetData = [] } = useGetAssetReportQuery({ category: '', status: '' }, { skip: reportType !== 'assets' });

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const getActiveReportData = () => {
    if (reportType === 'employees') return employeeData;
    if (reportType === 'payroll') return payrollData;
    if (reportType === 'assets') return assetData;
    return [];
  };

  const getReportTitle = () => {
    if (reportType === 'employees') return 'Employee Master Directory Report';
    if (reportType === 'payroll') return `Monthly Payroll Disbursal Sheet – ${month}/${year}`;
    if (reportType === 'assets') return 'Corporate Asset Allocation Register';
    return 'ERP Report';
  };

  const handleExportExcel = () => {
    const data = getActiveReportData();
    if (data.length === 0) {
      message.warning('No data available to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Report exported to Excel successfully.');
  };

  const textLabelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardTitleStyle = { fontWeight: 700, color: isDarkMode ? '#e2e8f0' : '#475569' };

  return (
    <div className="space-y-6">
      <div>
        <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
          Corporate Reports Center
        </Title>
        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: textLabelColor }}>
          Generate comprehensive registers for corporate audits and exports.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title={<span style={cardTitleStyle}>Report Settings</span>} variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 16 }}>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#94a3b8' }}>Report Type</label>
                <Select value={reportType} onChange={setReportType} className="w-full" size="large">
                  <Option value="employees">HR Employee Directory</Option>
                  <Option value="payroll">Monthly Payroll Sheet</Option>
                  <Option value="assets">Asset Inventory Register</Option>
                </Select>
              </div>

              {reportType === 'employees' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#94a3b8' }}>Branch</label>
                    <Select value={branchCode} onChange={setBranchCode} className="w-full" size="large" allowClear placeholder="All Branches">
                      {branches.map(b => <Option key={b.branchCode || b.BranchCode} value={b.branchCode || b.BranchCode}>{b.name || b.Name}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#94a3b8' }}>Status</label>
                    <Select value={status} onChange={setStatus} className="w-full" size="large" allowClear placeholder="All Statuses">
                      <Option value="Active">Active</Option>
                      <Option value="Suspended">Suspended</Option>
                      <Option value="Terminated">Terminated</Option>
                    </Select>
                  </div>
                </>
              )}

              {reportType === 'payroll' && (
                <Row gutter={8}>
                  <Col span={12}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#94a3b8' }}>Year</label>
                    <Select value={year} onChange={setYear} className="w-full" size="large">
                      <Option value={2026}>2026</Option>
                      <Option value={2027}>2027</Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: isDarkMode ? '#94a3b8' : '#94a3b8' }}>Month</label>
                    <Select value={month} onChange={setMonth} className="w-full" size="large">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <Option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
              )}

              <Divider style={{ margin: '16px 0' }} />

              <Space className="w-full" size="middle" direction="vertical">
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => setIsPreviewVisible(true)}
                  className="w-full bg-[#4f46e5] hover:bg-[#4338ca] border-none font-bold"
                  size="large"
                  style={{ borderRadius: '9999px' }}
                >
                  Print / Save PDF
                </Button>
                <Button
                  type="default"
                  icon={<FileExcelOutlined />}
                  onClick={handleExportExcel}
                  className="w-full font-semibold"
                  size="large"
                  style={{ borderRadius: '9999px' }}
                >
                  Export to Excel
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title={<span style={cardTitleStyle}>Live Preview Grid</span>} variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 16 }}>
            {getActiveReportData().length === 0 ? (
              <div className="text-center py-20 rounded-xl" style={{ background: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f9fafb' }}>
                <FileTextOutlined className="text-5xl text-gray-400 mb-2" />
                <Text type="secondary" style={{ display: 'block' }}>No report data matches selected filters.</Text>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px]">
                <Table
                  dataSource={getActiveReportData()}
                  rowKey={(record) => record.Id || record.id}
                  pagination={false}
                  size="small"
                  columns={
                    reportType === 'employees'
                      ? [
                          { title: 'Code', dataIndex: 'EmpCode' },
                          { title: 'Name', dataIndex: 'FullName', render: (t) => <strong>{t}</strong> },
                          { title: 'CNIC', dataIndex: 'CNIC' },
                          { title: 'Status', dataIndex: 'Status' },
                          { title: 'Basic Salary', dataIndex: 'BasicSalary', render: (v) => (v ?? 0).toLocaleString() },
                        ]
                      : reportType === 'payroll'
                      ? [
                          { title: 'Code', dataIndex: 'EmpCode' },
                          { title: 'Name', dataIndex: 'EmployeeName' },
                          { title: 'Basic', dataIndex: 'BasicSalary', render: (v) => (v ?? 0).toLocaleString() },
                          { title: 'Net', dataIndex: 'NetSalary', render: (v) => <strong>{(v ?? 0).toLocaleString()}</strong> },
                        ]
                      : [
                          { title: 'Code', dataIndex: 'AssetCode' },
                          { title: 'Name', dataIndex: 'Name' },
                          { title: 'Status', dataIndex: 'Status' },
                          { title: 'Assigned To', dataIndex: 'AssignedToEmployeeName' },
                        ]
                  }
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* PDF Print Preview Modal */}
      <Modal
        title="PDF Report Generation"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewVisible(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<FilePdfOutlined />} onClick={handlePrint} className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-bold" style={{ borderRadius: '9999px' }}>
            Print / Save
          </Button>
        ]}
        width={850}
      >
        <ReportPrintContent
          ref={printRef}
          type={reportType}
          data={getActiveReportData()}
          title={getReportTitle()}
          subtitle="Rizviz Int. Impex — Corporate Administration System"
        />
      </Modal>
    </div>
  );
};

export default Reports;
