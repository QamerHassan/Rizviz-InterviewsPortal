import React, { useState, useRef } from 'react';
import { Card, Table, Select, Button, Modal, Typography, Row, Col, Divider, message } from 'antd';
import { CalculatorOutlined, PrinterOutlined, FileTextOutlined, DollarCircleOutlined, UsergroupAddOutlined, FallOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { useGetMonthlyPayrollQuery, useProcessPayrollMutation, useGetPayslipQuery } from '../store/apiSlice';
import { useSelector } from 'react-redux';
import { selectCanEdit } from '../store/authSlice';
import StatCard from '../components/StatCard';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Payslip is always printed on white, so no dark mode needed inside print template
const PayslipPrintContent = React.forwardRef(({ data, companyName }, ref) => {
  if (!data) return null;
  return (
    <div ref={ref} style={{ padding: 40, fontFamily: 'sans-serif', color: '#1f2937' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#16a34a' }}>{companyName}</h2>
        <p style={{ margin: '4px 0', fontSize: 14, color: '#6b7280' }}>Staff Salary Payslip</p>
      </div>
      <Divider style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
      <Row gutter={[16, 12]} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <p style={{ margin: '4px 0' }}><strong>Employee Code:</strong> {data.EmpCode}</p>
          <p style={{ margin: '4px 0' }}><strong>Employee Name:</strong> {data.EmployeeName}</p>
          <p style={{ margin: '4px 0' }}><strong>Designation:</strong> {data.Designation}</p>
          <p style={{ margin: '4px 0' }}><strong>Department:</strong> {data.Department}</p>
        </Col>
        <Col span={12}>
          <p style={{ margin: '4px 0' }}><strong>Payslip Month:</strong> {data.Month}/{data.Year}</p>
          <p style={{ margin: '4px 0' }}><strong>Payment Mode:</strong> {data.PayMode}</p>
          <p style={{ margin: '4px 0' }}><strong>Bank Name:</strong> {data.BankName || 'N/A'}</p>
          <p style={{ margin: '4px 0' }}><strong>Account No:</strong> {data.AccountNumber || 'N/A'}</p>
        </Col>
      </Row>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Earnings</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (PKR)</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Deductions</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '8px 12px' }}>Basic Salary</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.BasicSalary?.toLocaleString()}</td>
            <td style={{ padding: '8px 12px' }}>Income Tax</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.TaxAmount?.toLocaleString()}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '8px 12px' }}>Allowances</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.Allowances?.toLocaleString()}</td>
            <td style={{ padding: '8px 12px' }}>Loan Repayment</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.LoanDeduction?.toLocaleString()}</td>
          </tr>
          <tr style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <td style={{ padding: '8px 12px' }}>Total Earnings</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(data.BasicSalary + data.Allowances)?.toLocaleString()}</td>
            <td style={{ padding: '8px 12px' }}>Total Deductions</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.Deductions?.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ backgroundColor: '#f0fdf4', padding: '16px 20px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: '#166534' }}>Net Disbursed Salary</span>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#166534' }}>PKR {data.NetSalary?.toLocaleString()}</span>
      </div>
      <Row gutter={32} style={{ marginTop: 60 }}>
        <Col span={12} style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto' }}></div>
          <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#6b7280' }}>Employee Signature</p>
        </Col>
        <Col span={12} style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto' }}></div>
          <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#6b7280' }}>Authorized Representative</p>
        </Col>
      </Row>
    </div>
  );
});

const PayrollProcess = () => {
  const { user } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const canEdit = useSelector(selectCanEdit);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [isPayslipVisible, setIsPayslipVisible] = useState(false);

  const { data: payrollDetails = [], isLoading, refetch } = useGetMonthlyPayrollQuery({ year, month });
  const [processPayroll, { isLoading: isProcessing }] = useProcessPayrollMutation();
  const { data: payslipData } = useGetPayslipQuery(
    { employeeId: selectedEmpId, month, year },
    { skip: !selectedEmpId }
  );

  const printRef = useRef(null);
  const payrollTableRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleStatCardClick = () => {
    payrollTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleProcess = async () => {
    try {
      await processPayroll({ year, month, processedBy: user.fullName }).unwrap();
      message.success('Monthly payroll processed and confirmed successfully.');
      refetch();
    } catch (err) {
      message.error(err?.data?.message || 'Payroll processing failed.');
    }
  };

  const handleOpenPayslip = (empId) => {
    setSelectedEmpId(empId);
    setIsPayslipVisible(true);
  };

  const columns = [
    { title: 'Emp Code', dataIndex: 'EmpCode', key: 'EmpCode', render: (text) => <span className="font-mono font-bold">{text}</span> },
    { title: 'Name', dataIndex: 'EmployeeName', key: 'EmployeeName', render: (text) => <span className="font-semibold">{text}</span> },
    { title: 'Basic Salary (PKR)', dataIndex: 'BasicSalary', render: (val) => (val ?? 0).toLocaleString() },
    { title: 'Allowances', dataIndex: 'Allowances', render: (val) => (val ?? 0).toLocaleString() },
    { title: 'Tax Deduction', dataIndex: 'TaxAmount', render: (val) => <span className="text-red-500">-{(val ?? 0).toLocaleString()}</span> },
    { title: 'Loans Paid', dataIndex: 'LoanDeduction', render: (val) => (val ?? 0) > 0 ? <span className="text-red-500">-{(val ?? 0).toLocaleString()}</span> : '0' },
    { title: 'Net Salary (PKR)', dataIndex: 'NetSalary', render: (val) => <span className={`font-bold ${isDarkMode ? 'text-indigo-400' : 'text-[#4f46e5]'}`}>{(val ?? 0).toLocaleString()}</span> },
    {
      title: 'Action', key: 'action',
      render: (_, record) => (
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => handleOpenPayslip(record.EmployeeId)}
          className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold flex items-center">
          Payslip
        </Button>
      ),
    },
  ];

  const totalNet = payrollDetails.reduce((sum, r) => sum + (r.NetSalary || 0), 0);
  const totalTax = payrollDetails.reduce((sum, r) => sum + (r.TaxAmount || 0), 0);
  const employeesPaid = payrollDetails.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            Payroll Processing
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Execute monthly runs, compute income taxes, and generate staff payslips.
          </Paragraph>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <StatCard
          label="TOTAL NET PAYOUT"
          value={`PKR ${totalNet.toLocaleString()}`}
          icon={<DollarCircleOutlined />}
          cardBg="#eff6ff"
          iconBg="#2563eb"
          colProps={{ span: 24 }}
          onClick={handleStatCardClick}
          clickLabel="View payroll"
          size="small"
        />
        <StatCard
          label="PROCESSED STAFF"
          value={employeesPaid}
          icon={<UsergroupAddOutlined />}
          cardBg="#ecfdf5"
          iconBg="#059669"
          colProps={{ span: 24 }}
          onClick={handleStatCardClick}
          clickLabel="View payroll"
          size="small"
        />
        <StatCard
          label="TOTAL TAX WITHHELD"
          value={`PKR ${totalTax.toLocaleString()}`}
          icon={<FallOutlined />}
          cardBg="#fef2f2"
          iconBg="#ef4444"
          colProps={{ span: 24 }}
          onClick={handleStatCardClick}
          clickLabel="View payroll"
          size="small"
        />
      </div>

      <Card ref={payrollTableRef} variant="borderless" className="shadow-sm" style={{ borderRadius: 16 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={year} onChange={setYear} style={{ width: 100 }}>
              <Option value={2026}>2026</Option>
              <Option value={2027}>2027</Option>
            </Select>
            <Select value={month} onChange={setMonth} style={{ width: 130 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <Option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</Option>
              ))}
            </Select>
          </div>
          {canEdit && (
            <Button type="primary" icon={<CalculatorOutlined />} onClick={handleProcess} loading={isProcessing}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
              Process Payroll Run
            </Button>
          )}
        </div>

        {payrollDetails.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f9fafb' }}>
            <FileTextOutlined className="text-5xl text-gray-400 mb-2" />
            <Text type="secondary" style={{ display: 'block' }}>No payroll runs found for selected period.</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Click "Process Payroll Run" to seed monthly payroll data.</Text>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table columns={columns} dataSource={payrollDetails}
              rowKey={(record) => record.Id || record.id}
              loading={isLoading} pagination={false} scroll={{ x: 700 }} size="middle" />
          </div>
        )}
      </Card>

      <Modal title="Employee Payslip Print View" open={isPayslipVisible}
        onCancel={() => setIsPayslipVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsPayslipVisible(false)}>Close</Button>,
          <Button key="submit" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}
            className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
            Print Payslip
          </Button>,
        ]}
        width="min(750px, 95vw)" style={{ top: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <PayslipPrintContent ref={printRef} data={payslipData} companyName="Rizviz Int. Impex" />
        </div>
      </Modal>
    </div>
  );
};

export default PayrollProcess;
