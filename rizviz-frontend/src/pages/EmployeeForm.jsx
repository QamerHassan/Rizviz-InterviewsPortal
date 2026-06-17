import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Tabs, Row, Col, DatePicker, Select, InputNumber, Table, Checkbox, Typography, Divider, Upload, App, Spin, Tooltip, Tag } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, UploadOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useGetDropdownsQuery,
  useGetEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useGetSalaryHistoryQuery
} from '../store/apiSlice';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isEditMode = !!id;

  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const { companyCode, branchCode } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  // API Queries
  const { data: employeeData, isLoading: isLoadEmpLoading } = useGetEmployeeByIdQuery(id, { skip: !isEditMode });
  const { data: grades = [] } = useGetDropdownsQuery('Grade');
  const { data: employeeTypes = [] } = useGetDropdownsQuery('EmployeeType');
  const { data: statuses = [] } = useGetDropdownsQuery('Status');
  const { data: religions = [] } = useGetDropdownsQuery('Religion');
  const { data: paymentModes = [] } = useGetDropdownsQuery('PayMode');

  // Document management
  const { data: docs = [], refetch: refetchDocs } = useGetEmployeeDocumentsQuery(id, { skip: !isEditMode });
  const [uploadDoc, { isLoading: isUploadingDoc }] = useUploadEmployeeDocumentMutation();

  // Salary history management
  const { data: salaryHistory = [] } = useGetSalaryHistoryQuery(id, { skip: !isEditMode });

  // Mutation hooks
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();

  // Auto-calculated States
  const [calculatedAge, setCalculatedAge] = useState(null);
  const [grossEstimate, setGrossEstimate] = useState(0);

  // Watch date of birth and basic salary for calculations
  const dobWatch = Form.useWatch('DateOfBirth', form);
  const basicSalaryWatch = Form.useWatch('BasicSalary', form);

  useEffect(() => {
    if (dobWatch) {
      const birthDate = dayjs(dobWatch);
      const age = dayjs().diff(birthDate, 'year');
      setCalculatedAge(age >= 0 ? age : null);
    } else {
      setCalculatedAge(null);
    }
  }, [dobWatch]);

  useEffect(() => {
    if (basicSalaryWatch) {
      // Calculate estimated gross: Basic Salary + 45% House Rent allowance + 10% Utility allowance
      const basic = Number(basicSalaryWatch);
      const estimated = basic + (basic * 0.45) + (basic * 0.10);
      setGrossEstimate(estimated);
    } else {
      setGrossEstimate(0);
    }
  }, [basicSalaryWatch]);

  // Load employee data on edit mode
  useEffect(() => {
    if (isEditMode && employeeData) {
      const formattedData = {
        ...employeeData,
        DateOfBirth: employeeData.DateOfBirth ? dayjs(employeeData.DateOfBirth) : null,
        JoiningDate: employeeData.JoiningDate ? dayjs(employeeData.JoiningDate) : null,
        JobOfferDate: employeeData.JobOfferDate ? dayjs(employeeData.JobOfferDate) : null,
        FinalInterviewDate: employeeData.FinalInterviewDate ? dayjs(employeeData.FinalInterviewDate) : null,
        CNICValidity: employeeData.CNICValidity ? dayjs(employeeData.CNICValidity) : null,
        PassportValidity: employeeData.PassportValidity ? dayjs(employeeData.PassportValidity) : null,
        LicenceValidity: employeeData.LicenceValidity ? dayjs(employeeData.LicenceValidity) : null,
        // Nest sub-models into form values
        BankName: employeeData.BankInformation?.BankName,
        AccountNumber: employeeData.BankInformation?.AccountNumber,
        IBAN: employeeData.BankInformation?.IBAN,
        BankBranchCode: employeeData.BankInformation?.BranchCode,
      };
      form.setFieldsValue(formattedData);
    }
  }, [isEditMode, employeeData, form]);

  const onFinish = async (values) => {
    try {
      // Re-assemble sub-models from flattened form
      const payload = {
        ...values,
        TermsAndConditions: values.TermsAndConditions ? "Agreed" : "Not Agreed",
        CompanyCode: companyCode || 'RII',
        BranchCode: branchCode || 'LHE',
        BankInformation: {
          BankName: values.BankName,
          AccountNumber: values.AccountNumber,
          IBAN: values.IBAN,
          BranchCode: values.BankBranchCode,
        },
        // Preserve arrays or set defaults
        Addresses: employeeData?.Addresses || [],
        EmergencyContacts: employeeData?.EmergencyContacts || [],
        BloodRelations: employeeData?.BloodRelations || [],
        HealthRecords: employeeData?.HealthRecords || [],
        EducationRecords: employeeData?.EducationRecords || [],
        EmploymentHistories: employeeData?.EmploymentHistories || [],
        DepartmentTeams: employeeData?.DepartmentTeams || [],
        SalaryHistories: employeeData?.SalaryHistories || [],
        SalaryIncrements: employeeData?.SalaryIncrements || [],
        LoansAdvances: employeeData?.LoansAdvances || [],
      };

      if (isEditMode) {
        await updateEmployee({ id, ...payload }).unwrap();
        message.success('Employee profile updated successfully.');
      } else {
        const created = await createEmployee(payload).unwrap();
        message.success('Employee onboarding profile created.');
        navigate(`/employees/edit/${created.Id || created.id}`);
      }
    } catch (err) {
      // Use standard error display
      let errMsg = 'Error processing request.';
      if (err?.data?.errors) {
        const keys = Object.keys(err.data.errors);
        if (keys.length > 0) {
          errMsg = err.data.errors[keys[0]][0];
        }
      } else if (err?.data?.message) {
        errMsg = err.data.message;
      }
      message.error(errMsg);
    }
  };

  const handleDocUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('docType', 'Educational Certificate');
      formData.append('fileName', file.name);
      await uploadDoc({ id, formData }).unwrap();
      refetchDocs();
      message.success('Document uploaded successfully.');
    } catch {
      message.error('Failed to upload document.');
    }
    return false; // Prevent automatic upload action
  };

  if (isEditMode && isLoadEmpLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spin size="large" description="Loading employee profile..." />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'basic',
      label: '1. Basic Info',
      children: (
        <div className="space-y-6">
          <Divider titlePlacement="left">Personal Particulars</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="FirstName" label="First Name" rules={[{ required: true, message: 'First name required' }]}>
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="MiddleName" label="Middle Name">
                <Input placeholder="Middle Name (Optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="LastName" label="Last Name" rules={[{ required: true, message: 'Last name required' }]}>
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="FatherName" label="Father / Husband Name" rules={[{ required: true, message: 'Father name required' }]}>
                <Input placeholder="Father's Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="DateOfBirth" label="Date of Birth" rules={[{ required: true, message: 'DOB required' }]}>
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
              {calculatedAge !== null && (
                <div className="text-xs font-semibold -mt-3 text-indigo-600 dark:text-indigo-400">Calculated Age: {calculatedAge} Years</div>
              )}
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="Gender" label="Gender" rules={[{ required: true, message: 'Gender required' }]}>
                <Select placeholder="Select Gender">
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="CNIC"
                label="CNIC (National ID)"
                rules={[
                  { required: true, message: 'CNIC required' },
                  { pattern: /^\d{5}-\d{7}-\d{1}$/, message: 'Must match format: 35201-1234567-9' }
                ]}
              >
                <Input placeholder="35201-1234567-9" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="CNICValidity" label="CNIC Validity">
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="Religion" label="Religion">
                <Select placeholder="Select Religion">
                  {religions.map(r => <Option key={r.key || r.Key} value={r.key || r.Key}>{r.value || r.Value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Contact & Official details</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="PassportNo" label="Passport Number">
                <Input placeholder="Passport No." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="PassportValidity" label="Passport Expiry">
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="NTN" label="NTN (Tax Number)">
                <Input placeholder="National Tax Number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Form.Item name="Status" label="Employment Status" rules={[{ required: true, message: 'Status required' }]}>
                <Select placeholder="Select Status">
                  {statuses.map(s => <Option key={s.key || s.Key} value={s.key || s.Key}>{s.value || s.Value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="Type" label="Employee Type" rules={[{ required: true, message: 'Type required' }]}>
                <Select placeholder="Select Type">
                  {employeeTypes.map(t => <Option key={t.key || t.Key} value={t.key || t.Key}>{t.value || t.Value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="Grade" label="Grade" rules={[{ required: true, message: 'Grade required' }]}>
                <Select placeholder="Select Grade">
                  {grades.map(g => <Option key={g.key || g.Key} value={g.key || g.Key}>{g.value || g.Value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="ItOrNonIt" label="IT / Non-IT" rules={[{ required: true, message: 'Categorization required' }]}>
                <Select placeholder="Select Stream">
                  <Option value="IT">IT Division</Option>
                  <Option value="Non-IT">Non-IT Division</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="JoiningDate" label="Joining Date" rules={[{ required: true, message: 'Joining Date required' }]}>
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="BasicSalary" label="Basic Salary (PKR)" rules={[{ required: true, message: 'Basic Salary required' }]}>
                <InputNumber className="w-full" min={0} placeholder="Basic Salary" />
              </Form.Item>
              {grossEstimate > 0 && (
                <div className="text-xs font-semibold -mt-3 text-indigo-600 dark:text-indigo-400">
                  Est. Gross Salary: {grossEstimate.toLocaleString()} PKR <Tooltip title="Basic + 45% Rent + 10% Utilities"><InfoCircleOutlined className="text-xs ml-1" /></Tooltip>
                </div>
              )}
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="PayMode" label="Payment Mode">
                <Select placeholder="Select Payment Mode">
                  {paymentModes.map(p => <Option key={p.key || p.Key} value={p.key || p.Key}>{p.value || p.Value}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="TermsAndConditions" valuePropName="checked" rules={[{ required: true, message: 'Must agree to terms' }]}>
            <Checkbox>I agree to terms and conditions of employment contract.</Checkbox>
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'bank',
      label: '2. Bank Info',
      children: (
        <div className="space-y-6">
          <Divider titlePlacement="left">Bank Account Mapping</Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="BankName" label="Bank Name">
                <Input placeholder="e.g. Meezan Bank, HBL" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="BankBranchCode" label="Branch Code">
                <Input placeholder="e.g. 0112, 0225" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="AccountNumber" label="Account Number">
                <Input placeholder="Standard Bank Account Number" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="IBAN" label="IBAN Number">
                <Input placeholder="e.g. PK00MEZN01020304050607" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'submodels',
      label: '3. Details & History',
      disabled: !isEditMode,
      children: (
        <div className="space-y-8">
          <div>
            <Title level={4}>Salary Increments & History Logs</Title>
            <Table
              dataSource={salaryHistory}
              rowKey={(record) => record.Id || record.id}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Effective Date',
                  dataIndex: 'EffectiveDate',
                  render: (d) => d ? new Date(d).toLocaleDateString() : 'N/A',
                },
                {
                  title: 'Basic Salary (PKR)',
                  dataIndex: 'BasicSalary',
                  render: (val) => (val ?? 0).toLocaleString(),
                },
                {
                  title: 'Reason for Adjustment',
                  dataIndex: 'Reason',
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>Assigned Assets & Inventory</Title>
            <Table
              dataSource={employeeData?.AssetAssignments || []}
              rowKey={(record) => record.Id || record.id}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Asset Code',
                  dataIndex: 'AssetCode',
                },
                {
                  title: 'Asset Name',
                  dataIndex: 'AssetName',
                },
                {
                  title: 'Assigned Date',
                  dataIndex: 'AssignedDate',
                  render: (d) => d ? new Date(d).toLocaleDateString() : 'N/A',
                },
                {
                  title: 'Status',
                  dataIndex: 'Status',
                },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'documents',
      label: '4. Documents',
      disabled: !isEditMode,
      children: (
        <div className="space-y-6">
          <Divider titlePlacement="left">Verify Educational & National Documents</Divider>
          
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-slate-800/40">
            <Upload beforeUpload={handleDocUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} loading={isUploadingDoc} type="primary" className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold">
                Upload Document File
              </Button>
            </Upload>
            <Paragraph className="text-gray-400 mt-2 text-xs">
              Supports PDF, PNG, JPG files up to 10MB
            </Paragraph>
          </div>

          <Table
            dataSource={docs}
            rowKey={(record) => record.Id || record.id}
            pagination={false}
            columns={[
              {
                title: 'Document Type',
                dataIndex: 'DocumentType',
              },
              {
                title: 'File Name',
                dataIndex: 'DocumentName',
              },
              {
                title: 'Uploaded At',
                dataIndex: 'UploadedAt',
                render: (d) => d ? new Date(d).toLocaleString() : 'N/A',
              },
              {
                title: 'Path',
                dataIndex: 'FilePath',
                render: (p) => <span className="font-mono text-gray-400 text-xs">{p}</span>,
              },
              {
                title: 'Verified',
                key: 'verified',
                render: () => <Tag color="green" icon={<CheckCircleOutlined />}>Verified</Tag>,
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center space-x-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')} style={{ flexShrink: 0, marginTop: 4 }} />
        <div className="min-w-0">
          <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(16px, 4vw, 24px)', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
            {isEditMode ? `Edit Profile (${employeeData?.EmpCode})` : 'New Onboarding Entry'}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 12, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            {isEditMode ? 'Update employment details and file registers.' : 'Record a new staff profile inside Rizviz ERP.'}
          </Paragraph>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark="optional"
        size="large"
      >
        <Card variant="borderless" className="shadow-sm" style={{ overflowX: 'hidden' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="mb-4"
            size="small"
            style={{ overflowX: 'auto' }}
          />
          
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button onClick={() => navigate('/employees')} block className="sm:w-auto">Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isCreating || isUpdating}
              className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-semibold sm:w-auto"
              block
            >
              {isEditMode ? 'Save Profile' : 'Onboard Employee'}
            </Button>
          </div>
        </Card>
      </Form>
    </div>
  );
};

export default EmployeeForm;
