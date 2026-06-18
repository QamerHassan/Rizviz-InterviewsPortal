import React, { useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, Typography, Select, Alert, message, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import logo from '../assets/logo.png';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { apiSlice, useLoginMutation, useGetCompaniesQuery, useGetBranchesQuery } from '../store/apiSlice';
import { setCredentials } from '../store/authSlice';

const { Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  // Watch company code to trigger branches reload
  const companyCode = Form.useWatch('companyCode', form);

  const { data: companies = [], isLoading: isLoadingCompanies } = useGetCompaniesQuery();
  const { data: branches = [], isLoading: isLoadingBranches } = useGetBranchesQuery(companyCode, {
    skip: !companyCode,
  });

  const displayCompanies = companies;
  const displayBranches = useMemo(() => (companyCode ? branches : []), [companyCode, branches]);

  const [login, { isLoading, error }] = useLoginMutation();

  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'Admin' || role === 'Interviewee' || role === 'Job Hunter' || role === 'Both') {
        navigate('/dashboard');
      } else {
        navigate('/interviews');
      }
    }
  }, [isAuthenticated, role, navigate]);

  // Set default company and branch
  useEffect(() => {
    if (displayCompanies.length > 0 && !form.getFieldValue('companyCode')) {
      const firstCompanyVal = displayCompanies[0].companyCode || displayCompanies[0].CompanyCode;
      form.setFieldsValue({ companyCode: firstCompanyVal });
    }
  }, [displayCompanies, form]);

  useEffect(() => {
    if (displayBranches.length > 0 && companyCode) {
      const currentBranch = form.getFieldValue('branchCode');
      const branchCodes = displayBranches.map(b => b.branchCode || b.BranchCode);
      if (!branchCodes.includes(currentBranch)) {
        const firstBranchVal = displayBranches[0].branchCode || displayBranches[0].BranchCode;
        form.setFieldsValue({ branchCode: firstBranchVal });
      }
    }
  }, [displayBranches, companyCode, form]);

  const onFinish = async (values) => {
    try {
      const response = await login(values).unwrap();

      // Clear ALL localStorage before saving new credentials
      localStorage.clear();

      // Reset Redux RTK Query caches to ensure no data leaks from previous user
      dispatch(apiSlice.util.resetApiState());

      // setCredentials handles both PascalCase (API) and camelCase automatically
      dispatch(setCredentials(response));
      // Use PascalCase from API response for immediate navigation decision
      const role = response.Role || response.role;
      const fullName = response.FullName || response.fullName || values.username;
      message.success(`Welcome back, ${fullName}!`);
      if (role === 'Admin' || role === 'Interviewee' || role === 'Job Hunter' || role === 'Both') {
        navigate('/dashboard');
      } else {
        navigate('/interviews');
      }
    } catch (err) {
      message.error(err?.data?.message || 'Invalid username or password');
    }
  };

  return (
    <Layout style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDarkMode
        ? 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f5f3ff 0%, #e2e8f0 100%)',
      padding: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-1 flex flex-col items-center">
          <div className="flex items-center justify-center mb-2">
            <img
              src={logo}
              alt="Rizviz Logo"
              className="h-56 w-auto object-contain"
              style={{
                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                filter: isDarkMode ? 'invert(1) brightness(1.2)' : 'none',
                margin: '-40px 0',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
          <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
            All Jobs Management System
          </Text>
        </div>

        {displayCompanies.length === 0 && !isLoadingCompanies && (
          <Alert
            type="warning"
            showIcon
            className="mb-3"
            message="Cannot load companies from database"
            description="Run scripts/start-api.ps1 first, then refresh this page."
          />
        )}

        <Card
          variant="borderless"
          className="shadow-xl rounded-2xl"
          styles={{ body: { padding: '12px 20px' } }}
        >
          <div className="text-center font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">
            Account Login
          </div>

          {error && (
            <Alert
              message={error?.data?.message || 'Login Failed'}
              type="error"
              showIcon
              className="mb-2 rounded-xl font-medium"
            />
          )}

          <Form
            form={form}
            name="login_form"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              name="companyCode"
              label={<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</span>}
              rules={[{ required: true, message: 'Please select company!' }]}
              style={{ marginBottom: '8px' }}
            >
              <Select
                placeholder="Select Company"
                loading={isLoadingCompanies}
                options={displayCompanies.map(c => {
                  const name = c.name || c.Name || '';
                  const label = name.toLowerCase().includes('rizviz int')
                    ? 'Rizviz International Impex'
                    : name;
                  return { value: c.companyCode || c.CompanyCode, label };
                })}
                className="pill-select"
              />
            </Form.Item>

            <Form.Item
              name="branchCode"
              label={<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</span>}
              rules={[{ required: true, message: 'Please select branch!' }]}
              style={{ marginBottom: '8px' }}
            >
              <Select
                placeholder="Select Branch"
                loading={isLoadingBranches}
                disabled={!companyCode}
                options={displayBranches.map(b => ({ value: b.branchCode || b.BranchCode, label: b.name || b.Name }))}
                className="pill-select"
              />
            </Form.Item>

            <Form.Item
              name="username"
              label={<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Username</span>}
              rules={[{ required: true, message: 'Please input your Username!' }]}
              style={{ marginBottom: '8px' }}
            >
              <Input prefix={<UserOutlined className="text-[#4f46e5]" />} placeholder="Username" className="pill-input" />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</span>}
              rules={[{ required: true, message: 'Please input your Password!' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input.Password prefix={<LockOutlined className="text-[#4f46e5]" />} placeholder="Password" className="pill-input" />
            </Form.Item>

            <Form.Item className="mt-2 mb-0" style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                className="bg-[#4f46e5] hover:bg-[#4338ca] border-none font-bold text-sm shadow-lg shadow-indigo-500/25"
                style={{ height: 40, borderRadius: '9999px' }}
              >
                Sign In to Platform
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <div className="text-center mt-2">
          <Text style={{ color: isDarkMode ? '#64748b' : '#94a3b8', fontSize: '10px', fontWeight: 500 }}>
            © {new Date().getFullYear()} Rizviz Int. Impex. All rights reserved.
          </Text>
        </div>

      </div>
    </Layout>
  );
};

export default Login;
